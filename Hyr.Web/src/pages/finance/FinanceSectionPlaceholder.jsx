export default function FinanceSectionPlaceholder({ title }) {
    return (
        <div className="flex h-full w-full items-start justify-center px-6 pt-24">
            <div className="max-w-3xl text-center">
                <h1 className="text-xl text-gray-700">{title}</h1>
                <p className="mt-3 text-sm text-gray-500">Denna del ar under uppbyggnad.</p>
            </div>
        </div>
    );
}
