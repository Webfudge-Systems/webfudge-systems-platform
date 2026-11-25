export function Image({ alt = '', ...props }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...props} />;
}

export default function Link({ href = '#', children, ...props }) {
  return (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  );
}
