import logo from '@/assets/logo.png';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string;
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

const Logo = ({ size = 'sm', showText = true, linkTo = '/', className = '' }: LogoProps) => {
  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="De12eMan logo" className={`${sizes[size]} object-contain`} />
      {showText && <span className={`font-heading font-bold ${textSizes[size]} text-foreground`}>De12eMan</span>}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }
  return content;
};

export default Logo;
