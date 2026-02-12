import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode: number | undefined;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-primary-400 mb-4">
          {statusCode || 'Error'}
        </h1>
        <p className="text-dark-300 text-lg mb-6">
          {statusCode === 404
            ? 'Page not found.'
            : 'An unexpected error occurred.'}
        </p>
        <a
          href="/dashboard"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-500 transition-colors inline-block"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
