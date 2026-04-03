import React from 'react';
import { useNavigate } from 'react-router-dom';

const SomethingWentWrong = ({ error, resetError }) => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        if (resetError) resetError();
        navigate('/');
    };

    const handleGoBack = () => {
        if (resetError) resetError();
        navigate(-1);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <svg
                        className="mx-auto h-16 w-16 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    Något gick fel
                </h1>

                <p className="text-gray-600 mb-6">
                    Vi beklagar, men något oväntat hände. Vänligen försök igen eller kontakta support om problemet kvarstår.
                </p>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-left">
                        <p className="text-xs text-red-700 font-mono break-all">
                            {error.message || error.toString()}
                        </p>
                    </div>
                )}

                <div className="flex flex-col space-y-3">
                    <button
                        onClick={handleGoBack}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                        Gå tillbaka
                    </button>
                    <button
                        onClick={handleGoHome}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
                    >
                        Gå till startsidan
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 transition-colors"
                    >
                        Ladda om sidan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SomethingWentWrong;
