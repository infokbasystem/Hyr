import { useEffect, useState } from "react";

const FortnoxRedirect = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [code, setCode] = useState("");
    const [state, setState] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [activated, setActivated] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setCode(params.get("code") || "");
        setState(params.get("state") || "");
    }, []);

    async function handleActivate() {
        setLoading(true);
        setMessage("");
        try {
            const token = localStorage.getItem('token');
            const redirectUrl = window.location.origin + '/settings/fortnoxredirect';
            const response = await fetch(`${apiUrl}/settings/fortnoxactivate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ code, state, redirectUrl }),
            });
            if (response.ok) {
                setActivated(true);
                setMessage("Kopplingen aktiverades! Du kan nu stänga denna flik och bokföra fakturor.");
            } else {
                const err = await response.status;
                const data = await response.json();
                setMessage("Fel vid aktivering: " + err + ". " + data.message);
            }
        } catch (error) {
            const err = await response.status;
            setMessage("Nätverksfel: " + error.message);
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className="flex min-h-screen justify-center pr-50 pt-10">
            <div className="w-full max-w-lg">
                <h1 className="mb-6 text-center text-xl">
                    Svar från Fortnox
                </h1>

                <div className="space-y-4">
                    {/* Code box */}
                    <div className="bg-white p-8 text-center shadow-sm">
                        <p className="text-xs text-gray-500">KOD</p>
                        <p className="text-xs mt-2 break-all text-gray-800">
                            {code}
                        </p>
                    </div>

                    {/* State box */}
                    <div className="bg-white p-8 text-center shadow-sm">
                        <p className="text-xs text-gray-500">FÖRETAG</p>
                        <p className="text-xs mt-2 text-gray-800">{state}</p>
                    </div>
                </div>

                {/* Button */}
                {!activated && (
                    <div className="mt-10 flex justify-center">
                        <button
                            onClick={handleActivate}
                            disabled={loading}
                            className="w-80 text-center text-xs text-white bg-green-700 hover:bg-green-800 p-[10px] transition">
                            {loading ? "Aktiverar..." : "AKTIVERA KOPPLING"}
                        </button>
                    </div>
                )}
                <div className="mt-5 flex justify-center">
                    {message && (<p className="text-l text-red-700 text-center">{message}</p>)}
                </div>
            </div>
        </div>
    )
}

export default FortnoxRedirect