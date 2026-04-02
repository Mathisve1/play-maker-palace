import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validateIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(clean) && clean.length >= 15 && clean.length <= 34;
}

function validateBic(bic: string): boolean {
  if (!bic) return true; // BIC is optional
  const clean = bic.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean);
}

function generateSepaXml(params: {
  batchRef: string;
  batchMessage: string;
  clubName: string;
  clubIban: string;
  clubBic: string;
  items: Array<{
    id: string;
    holderName: string;
    iban: string;
    bic: string;
    amount: number;
    reference: string;
  }>;
}): string {
  const { batchRef, batchMessage, clubName, clubIban, clubBic, items } = params;
  const now = new Date();
  const creationDateTime = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const executionDate = now.toISOString().split('T')[0];
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const msgId = `MSG-${batchRef}-${Date.now()}`;

  const txBlocks = items.map((item) => {
    const cleanIban = item.iban.replace(/\s/g, '');
    const cleanBic = item.bic?.replace(/\s/g, '') || '';
    return `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(item.id.substring(0, 35))}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${item.amount.toFixed(2)}</InstdAmt>
        </Amt>${cleanBic ? `
        <CdtrAgt>
          <FinInstnId>
            <BIC>${escapeXml(cleanBic)}</BIC>
          </FinInstnId>
        </CdtrAgt>` : ''}
        <Cdtr>
          <Nm>${escapeXml(item.holderName.substring(0, 70))}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${escapeXml(cleanIban)}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(item.reference.substring(0, 140))}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
  }).join('');

  const cleanClubIban = clubIban.replace(/\s/g, '');
  const cleanClubBic = clubBic?.replace(/\s/g, '') || '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(clubName.substring(0, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(batchRef.substring(0, 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${executionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(clubName.substring(0, 70))}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${escapeXml(cleanClubIban)}</IBAN>
        </Id>
      </DbtrAcct>${cleanClubBic ? `
      <DbtrAgt>
        <FinInstnId>
          <BIC>${escapeXml(cleanClubBic)}</BIC>
        </FinInstnId>
      </DbtrAgt>` : ''}${txBlocks}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // Webhook action (no auth required)
  if (action === 'webhook') {
    try {
      const body = await req.json();
      if (body.event_type === 'form.completed' && body.data?.submission_id) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        const submissionId = body.data.submission_id;
        
        // Find the batch with this submission
        const { data: batch } = await adminClient
          .from('sepa_batches')
          .select('*')
          .eq('docuseal_submission_id', submissionId)
          .single();

        if (batch) {
          // Update batch status to signed
          await adminClient
            .from('sepa_batches')
            .update({ 
              status: 'signed',
              docuseal_document_url: body.data.documents?.[0]?.url || null,
            })
            .eq('id', batch.id);

          // Update all batch items to sent_to_bank
          await adminClient
            .from('sepa_batch_items')
            .update({ status: 'sent_to_bank' })
            .eq('batch_id', batch.id);

          // Send notification emails to volunteers
          if (resendApiKey && resendFromEmail) {
            const { data: items } = await adminClient
              .from('sepa_batch_items')
              .select('volunteer_id, amount')
              .eq('batch_id', batch.id);

            if (items && items.length > 0) {
              const volunteerIds = items.map(i => i.volunteer_id);
              const { data: profiles } = await adminClient
                .from('profiles')
                .select('id, email, full_name')
                .in('id', volunteerIds);

              const { data: club } = await adminClient
                .from('clubs')
                .select('name')
                .eq('id', batch.club_id)
                .single();

              for (const profile of (profiles || [])) {
                if (!profile.email) continue;
                const item = items.find(i => i.volunteer_id === profile.id);
                const amount = item ? Number(item.amount).toFixed(2) : '0.00';

                try {
                  await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      from: resendFromEmail,
                      to: [profile.email],
                      subject: `Uitbetaling klaargezet - €${amount}`,
                      html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                          <h2>Goed nieuws, ${profile.full_name || 'vrijwilliger'}! 🎉</h2>
                          <p>Je onkostenvergoeding van <strong>€${amount}</strong> is door ${club?.name || 'de club'} klaargezet voor de bank.</p>
                          <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin: 16px 0;">
                            <p style="margin: 0; color: #71717a; font-size: 14px;">
                              ⏳ <strong>Let op:</strong> Omdat dit via een bank-batch verwerkt wordt, kan het tot <strong>7 werkdagen</strong> duren voordat het bedrag op je rekening staat.
                            </p>
                          </div>
                          <p style="color: #71717a; font-size: 13px;">Dit is een automatisch bericht.</p>
                        </div>
                      `,
                    }),
                  });
                } catch (emailErr) {
                  console.error('Email send error:', emailErr);
                }

                // Create in-app notification
                await adminClient.from('notifications').insert({
                  user_id: profile.id,
                  title: 'Uitbetaling klaargezet',
                  message: `Je onkostenvergoeding van €${amount} is klaargezet voor de bank. Het kan tot 7 werkdagen duren.`,
                  type: 'payment_sent',
                });
              }
            }
          }
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('Webhook error:', err);
      return new Response(JSON.stringify({ error: 'Webhook failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Auth required for all other actions
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const userId = user.id;

  if (action === 'generate-xml') {
    try {
      const body = await req.json();
      const { batchId } = body;

      // Fetch batch with items
      const { data: batch, error: batchError } = await supabase
        .from('sepa_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (batchError || !batch) {
        return new Response(JSON.stringify({ error: 'Batch not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: items } = await supabase
        .from('sepa_batch_items')
        .select('*')
        .eq('batch_id', batchId);

      if (!items || items.length === 0) {
        return new Response(JSON.stringify({ error: 'No items in batch' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get club info for debtor
      const { data: club } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', batch.club_id)
        .single();

      // We need the club's own IBAN/BIC - use the body params
      const { clubIban, clubBic } = body;
      if (!clubIban || !validateIban(clubIban)) {
        return new Response(JSON.stringify({ error: 'Ongeldig of ontbrekend IBAN-nummer voor de club.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (clubBic && !validateBic(clubBic)) {
        return new Response(JSON.stringify({ error: 'Ongeldig BIC-formaat.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const xml = generateSepaXml({
        batchRef: batch.batch_reference,
        batchMessage: batch.batch_message || '',
        clubName: club?.name || 'Club',
        clubIban,
        clubBic: clubBic || '',
        items: items.map(item => ({
          id: item.id,
          holderName: item.holder_name || 'Onbekend',
          iban: item.iban,
          bic: item.bic || '',
          amount: Number(item.amount),
          reference: batch.batch_message || `Vrijwilligersvergoeding ${batch.batch_reference}`,
        })),
      });

      // Store XML in batch
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      await adminClient
        .from('sepa_batches')
        .update({ xml_content: xml })
        .eq('id', batchId);

      return new Response(JSON.stringify({ success: true, xml }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('generate-xml error:', err);
      return new Response(JSON.stringify({ error: 'XML generatie mislukt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'create-signing') {
    try {
      const body = await req.json();
      const { batchId, signerName, signerEmail } = body;

      const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');
      if (!docusealApiKey) {
        return new Response(JSON.stringify({ error: 'DocuSeal not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get batch info
      const { data: batch } = await supabase
        .from('sepa_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (!batch) {
        return new Response(JSON.stringify({ error: 'Batch not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('nl-BE', { year: 'numeric', month: 'long', day: 'numeric' });

      // Create HTML template for signing - use DocuSeal {{field;type=signature}} syntax
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #1a1a1a; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
            SEPA Uitbetalingsverklaring
          </h1>
          <p style="color: #4b5563; line-height: 1.6;">
            Datum: <strong>${dateStr}</strong><br/>
            Referentie: <strong>${batch.batch_reference}</strong><br/>
            Totaalbedrag: <strong>€${Number(batch.total_amount).toFixed(2)}</strong><br/>
            Aantal transacties: <strong>${batch.item_count}</strong>
          </p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #1f2937; line-height: 1.8;">
              Ik, <strong>${signerName}</strong>, bevestig hierbij dat ik dit SEPA XML-bestand heb gegenereerd voor legitieme uitbetalingen en verklaar de inhoud van dit bestand niet handmatig te wijzigen na download. Ik begrijp dat ik verantwoordelijk ben voor de uiteindelijke upload bij de bank.
            </p>
          </div>
          <div style="margin-top: 40px;">
            <p style="color: #6b7280; font-size: 14px;">Handtekening:</p>
            <signature-field name="Handtekening" role="First Party" style="width: 200px; height: 80px; display: inline-block;"></signature-field>
          </div>
        </div>
      `;

      // Create template via HTML API
      const templateRes = await fetch('https://api.docuseal.com/templates/html', {
        method: 'POST',
        headers: {
          'X-Auth-Token': docusealApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          name: `SEPA Verklaring - ${batch.batch_reference}`,
        }),
      });

      const templateText = await templateRes.text();
      console.log('DocuSeal template response:', templateRes.status, templateText);
      let template;
      try { template = JSON.parse(templateText); } catch { template = null; }
      if (!template?.id) {
        console.error('DocuSeal template creation failed:', templateText);
        return new Response(JSON.stringify({ error: 'Ondertekeningssjabloon kon niet worden aangemaakt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create submission
      const submissionRes = await fetch('https://api.docuseal.com/submissions', {
        method: 'POST',
        headers: {
          'X-Auth-Token': docusealApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          send_email: false,
          submitters: [
            {
              email: signerEmail,
              name: signerName,
              role: 'First Party',
            },
          ],
        }),
      });

      const submissionText = await submissionRes.text();
      console.log('DocuSeal submission response:', submissionRes.status, submissionText);
      let submission;
      try { submission = JSON.parse(submissionText); } catch { submission = null; }
      const submitter = Array.isArray(submission) ? submission[0] : submission;
      
      if (!submitter?.id) {
        console.error('DocuSeal submission creation failed:', submissionText);
        return new Response(JSON.stringify({ error: 'Ondertekeningsverzoek kon niet worden aangemaakt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Update batch with submission info
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      await adminClient
        .from('sepa_batches')
        .update({
          docuseal_submission_id: submitter.submission_id || submitter.id,
          signer_name: signerName,
          status: 'awaiting_signature',
        })
        .eq('id', batchId);

      return new Response(JSON.stringify({ 
        success: true, 
        signingUrl: submitter.embed_src || submitter.signing_url,
        submissionId: submitter.submission_id || submitter.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('create-signing error:', err);
      return new Response(JSON.stringify({ error: 'Ondertekening kon niet worden gestart.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'mark-downloaded') {
    try {
      const body = await req.json();
      const { batchId } = body;
      
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      await adminClient
        .from('sepa_batches')
        .update({ status: 'downloaded' })
        .eq('id', batchId);

      // Send push notifications to volunteers in this batch
      const { data: items } = await adminClient
        .from('sepa_batch_items')
        .select('volunteer_id, amount')
        .eq('batch_id', batchId)
        .eq('error_flag', false);

      if (items && items.length > 0) {
        for (const item of items) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'payment_exported',
                user_id: item.volunteer_id,
                title: 'Goed nieuws! 🎉',
                message: `Je vergoeding van €${Number(item.amount).toFixed(2)} is in verwerking.`,
                url: '/dashboard',
              }),
            });
          } catch (pushErr) {
            console.error('Push notification error:', pushErr);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('mark-downloaded error:', err);
      return new Response(JSON.stringify({ error: 'Actie mislukt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'create-rollback-signing') {
    try {
      const body = await req.json();
      const { batchId, batchReference, totalAmount, itemCount, signerName, signerEmail } = body;

      const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');
      if (!docusealApiKey) {
        return new Response(JSON.stringify({ error: 'DocuSeal not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('nl-BE', { year: 'numeric', month: 'long', day: 'numeric' });

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #dc2626; font-size: 20px; border-bottom: 2px solid #fecaca; padding-bottom: 12px;">
            SEPA Annuleringsverklaring
          </h1>
          <p style="color: #4b5563; line-height: 1.6;">
            Datum: <strong>${dateStr}</strong><br/>
            Referentie: <strong>${escapeXml(batchReference)}</strong><br/>
            Totaalbedrag: <strong>€${Number(totalAmount).toFixed(2)}</strong><br/>
            Aantal transacties: <strong>${itemCount}</strong>
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #1f2937; line-height: 1.8;">
              Ik, <strong>${escapeXml(signerName)}</strong>, verklaar hierbij dat ik de SEPA-batch met referentie <strong>${escapeXml(batchReference)}</strong> wens terug te draaien en te annuleren. 
              Ik begrijp dat alle transacties in deze batch ongedaan worden gemaakt en dat de betrokken vrijwilligers opnieuw in de betaallijst verschijnen. 
              Ik bevestig dat het bijbehorende SEPA XML-bestand NIET is geüpload naar de bank, of dat ik de nodige stappen heb ondernomen om de banktransactie te annuleren.
            </p>
          </div>
          <div style="margin-top: 40px;">
            <p style="color: #6b7280; font-size: 14px;">Handtekening:</p>
            <signature-field name="Handtekening" role="First Party" style="width: 200px; height: 80px; display: inline-block;"></signature-field>
          </div>
        </div>
      `;

      // Create template
      const templateRes = await fetch('https://api.docuseal.com/templates/html', {
        method: 'POST',
        headers: {
          'X-Auth-Token': docusealApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          name: `SEPA Annulering - ${batchReference}`,
        }),
      });

      const templateText = await templateRes.text();
      let template;
      try { template = JSON.parse(templateText); } catch { template = null; }
      if (!template?.id) {
        console.error('DocuSeal rollback template failed:', templateText);
        return new Response(JSON.stringify({ error: 'Annuleringssjabloon kon niet worden aangemaakt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create submission
      const submissionRes = await fetch('https://api.docuseal.com/submissions', {
        method: 'POST',
        headers: {
          'X-Auth-Token': docusealApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          send_email: false,
          submitters: [
            {
              email: signerEmail,
              name: signerName,
              role: 'First Party',
            },
          ],
        }),
      });

      const submissionText = await submissionRes.text();
      let submission;
      try { submission = JSON.parse(submissionText); } catch { submission = null; }
      const submitter = Array.isArray(submission) ? submission[0] : submission;

      if (!submitter?.id) {
        console.error('DocuSeal rollback submission failed:', submissionText);
        return new Response(JSON.stringify({ error: 'Annuleringsverzoek kon niet worden aangemaakt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        signingUrl: submitter.embed_src || submitter.signing_url,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('create-rollback-signing error:', err);
      return new Response(JSON.stringify({ error: 'Annulering kon niet worden gestart.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'rollback') {
    try {
      const body = await req.json();
      const { batchId } = body;

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      // Get the batch
      const { data: batch, error: batchErr } = await adminClient
        .from('sepa_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (batchErr || !batch) {
        return new Response(JSON.stringify({ error: 'Batch not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Delete all batch items first (FK constraint)
      await adminClient
        .from('sepa_batch_items')
        .delete()
        .eq('batch_id', batchId);

      // Delete the batch itself
      await adminClient
        .from('sepa_batches')
        .delete()
        .eq('id', batchId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('rollback error:', err);
      return new Response(JSON.stringify({ error: 'Terugdraaien mislukt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'flag-item') {
    try {
      const body = await req.json();
      const { itemId, errorFlag, errorMessage } = body;

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      await adminClient
        .from('sepa_batch_items')
        .update({
          error_flag: errorFlag,
          error_message: errorFlag ? (errorMessage || 'Fout gemarkeerd') : null,
        })
        .eq('id', itemId);

      // Recalculate batch totals
      const { data: item } = await adminClient
        .from('sepa_batch_items')
        .select('batch_id')
        .eq('id', itemId)
        .single();

      if (item) {
        const { data: validItems } = await adminClient
          .from('sepa_batch_items')
          .select('amount')
          .eq('batch_id', item.batch_id)
          .eq('error_flag', false);

        const newTotal = (validItems || []).reduce((sum, i) => sum + Number(i.amount), 0);
        const newCount = (validItems || []).length;

        await adminClient
          .from('sepa_batches')
          .update({
            total_amount: newTotal,
            item_count: newCount,
          })
          .eq('id', item.batch_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('flag-item error:', err);
      return new Response(JSON.stringify({ error: 'Markering mislukt.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
