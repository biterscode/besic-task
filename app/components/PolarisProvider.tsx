import { AppProvider } from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';
import enTranslations from '@shopify/polaris/locales/en.json';

export function PolarisProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <AppProvider
      i18n={enTranslations}
      linkComponent={({ children, url, ...rest }) => (
        <a
          href={url}
          {...rest}
          onClick={(e) => {
            e.preventDefault();
            navigate(url);
          }}
        >
          {children}
        </a>
      )}
    >
      {children}
    </AppProvider>
  );
}