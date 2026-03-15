import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
}

const SITE_URL = 'https://play-maker-palace.lovable.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/pwa-512.png`;

const SEOHead = ({ title, description, ogImage, canonical }: SEOHeadProps) => {
  const image = ogImage || DEFAULT_OG_IMAGE;
  const url = canonical ? `${SITE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      {url && <link rel="canonical" href={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEOHead;
