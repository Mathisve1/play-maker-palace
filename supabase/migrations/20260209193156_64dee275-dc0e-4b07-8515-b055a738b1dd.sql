
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'club_owner', 'volunteer');

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'volunteer',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sport TEXT,
  location TEXT,
  logo_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_date TIMESTAMPTZ,
  location TEXT,
  spots_available INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Task signups table
CREATE TABLE public.task_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, volunteer_id)
);
ALTER TABLE public.task_signups ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile and volunteer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'volunteer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: users read own, admins read all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles: users read own
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Clubs: everyone can read
CREATE POLICY "Anyone can read clubs" ON public.clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Club owners can update own clubs" ON public.clubs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins can manage clubs" ON public.clubs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Tasks: everyone authenticated can read
CREATE POLICY "Authenticated can read tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Club owners can manage own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
);
CREATE POLICY "Club owners can update own tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
);
CREATE POLICY "Club owners can delete own tasks" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Task signups: volunteers can sign up and see own
CREATE POLICY "Volunteers can read own signups" ON public.task_signups FOR SELECT USING (auth.uid() = volunteer_id);
CREATE POLICY "Club owners can see signups for their tasks" ON public.task_signups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t JOIN public.clubs c ON t.club_id = c.id WHERE t.id = task_id AND c.owner_id = auth.uid())
);
CREATE POLICY "Volunteers can sign up" ON public.task_signups FOR INSERT TO authenticated WITH CHECK (auth.uid() = volunteer_id);
CREATE POLICY "Volunteers can cancel own signup" ON public.task_signups FOR DELETE USING (auth.uid() = volunteer_id);
CREATE POLICY "Admins can manage signups" ON public.task_signups FOR ALL USING (public.has_role(auth.uid(), 'admin'));
