import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import DateRangeSelect from '../components/DateRangeSelect';
import apiClient from '../lib/apiClient';


const CarSearchModal = ({ isOpen, onClose, onSearch }) => {
    const [period, setPeriod] = useState({ from: null, to: null });
    const [category, setCategory] = useState('');
    const [model, setModel] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    const [loadError, setLoadError] = useState('');


    const fetchLists = async () => {

        try {
            const response = await apiClient.get('/itemcategory');
            const data = response.data;
            setAvailableCategories([{ id: '', name: '' }, ...data]);
        } catch (error) {
            console.error('Error fetching calculationunits:', error);
        }


    };


    const handleSearch = () => {
        onSearch({ period, category, model });
        onClose();
    };

    const categoryOptions = useMemo(() => ([
        { label: isLoadingFilters ? 'Laddar kategorier...' : 'Alla kategorier', value: '' },
        ...availableCategories,
    ]), [availableCategories, isLoadingFilters]);

    const modelOptions = useMemo(() => ([
        { label: isLoadingFilters ? 'Laddar modeller...' : 'Alla modeller', value: '' },
        ...availableModels,
    ]), [availableModels, isLoadingFilters]);


    useEffect(() => {
        if (isOpen) {
            fetchLists();
        }
    }, [isOpen]);


    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 z-40" />
            <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={onClose}>
                <div
                    className="relative w-180 bg-white rounded-sm shadow-xl py-6 px-10"
                    style={{ background: 'rgb(255, 255, 234)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative flex items-center justify-center mb-4">
                        <h2 className="text-sm font-semibold text-center">
                            Sök lediga bilar
                        </h2>
                        <button
                            onClick={onClose}
                            className="absolute right-0 text-gray-400 hover:text-gray-600 text-l leading-none mb-1"
                        >
                            ×
                        </button>
                    </div>
                    <div className="mx-auto">
                        <div className="text-xs text-gray-700 grid grid-cols-2 gap-10 place-items-center justify-center">
                            <div className="flex flex-col items-center w-full px-10">
                                <label className="block mb-1 text-xs text-center">Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="text-xs w-full border border-gray-300 rounded-sm px-2 py-1 focus:outline-none bg-white"
                                    disabled={isLoadingFilters && availableCategories.length === 0}
                                >
                                    {categoryOptions.map((option) => (
                                        <option key={`category-${option.value || 'all'}`} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col items-center w-full px-10">
                                <label className="block mb-1 text-xs text-center">Modell</label>
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="text-xs w-full border border-gray-300 rounded-sm px-2 py-1 focus:outline-none bg-white"
                                    disabled={isLoadingFilters && filteredModels.length === 0}
                                >
                                    {modelOptions.map((option) => (
                                        <option key={`model-${option.value || 'all'}`} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {loadError && (
                            <div className="mt-3 px-10 text-center text-[11px] text-red-600">
                                {loadError}
                            </div>
                        )}
                        <div className="my-3 flex flex-col items-center">
                            <DateRangeSelect onChange={setPeriod} />
                        </div>
                        <div className="flex gap-4 mt-3 mb-4 pt-4 justify-end">
                            <button
                                onClick={onClose}
                                className="shadow-md/30 text-xs text-white bg-orange-400 hover:bg-orange-600 px-10 p-[5px]"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={handleSearch}
                                className={`shadow-md/30 text-xs text-white px-10 p-[5px] bg-lime-700 hover:bg-lime-900`}
                                disabled={!period.from || !period.to}
                            >
                                Sök
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );

};

export default CarSearchModal;
