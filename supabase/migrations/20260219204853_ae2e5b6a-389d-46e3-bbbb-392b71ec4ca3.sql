-- Add config_data JSONB column for provider-specific configuration
ALTER TABLE public.ticketing_configs 
ADD COLUMN config_data jsonb DEFAULT '{}'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN public.ticketing_configs.config_data IS 'Provider-specific configuration data (e.g. Weezevent username/password, Ticketmatic account_name)';