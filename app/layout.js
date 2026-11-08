import './globals.css';

export const metadata = {
  title: 'ប្រព័ន្ធបណ្ណាល័យ',
  description: 'ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យសហគមន៍',
};

export default function RootLayout({ children }) {
  return (
    <html lang="km">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
