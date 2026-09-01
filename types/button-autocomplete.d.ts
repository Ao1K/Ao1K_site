import 'react';

// autoComplete is valid on <button> per the HTML spec, but missing from React's types
declare module 'react' {
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    autoComplete?: 'on' | 'off';
  }
}
