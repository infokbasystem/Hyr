import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import apiClient from '../lib/apiClient';

export default function CustomerSearchModal({ isOpen, onClose, onSelectCustomer }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const searchCustomers = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiClient.get(`/customer?searchTerm=${encodeURIComponent(query)}`);
            const data = response.data;
            setSearchResults(Array.isArray(data.data) ? data.data : []);
        } catch (error) {
            console.error('Error searching customers:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            searchCustomers(searchQuery);
        }, 200);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset selected index when search results change
    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchResults]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen || searchResults.length === 0) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => 
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                handleSelectCustomer(searchResults[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, searchResults, selectedIndex]);

    const handleSelectCustomer = (customer) => {
        onSelectCustomer(customer);
        setSearchQuery('');
        setSearchResults([]);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 z-40" onClick={onClose} />
            <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={onClose}>
                <div
                    className="relative bg-white rounded-sm shadow-xl max-w-xl w-full mx-4 p-6"
                    style={{ background: 'rgb(255, 255, 234)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative flex items-center justify-center mb-4">
                        <h2 className="text-sm text-gray-700 text-center">
                            SÖK KUND
                        </h2>
                        <button
                            onClick={onClose}
                            className="absolute right-0 text-gray-400 hover:text-gray-600 text-l leading-none mb-1"
                        >
                            ×
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="mx-10 mt-7 mb-4">
                        <div className="relative flex items-center">
                            <Search className="absolute left-2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Sök på namn eller organisationsnummer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-sm text-xs focus:outline-none focus:border-blue-500 text-center bg-white"
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="mx-10 mb-4 max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-xs text-gray-500">
                                Söker...
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-500">
                                {searchQuery ? 'Inga kunder hittades' : 'Börja skriva för att söka'}
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {searchResults.map((customer, index) => (
                                    <li
                                        key={customer.id}
                                        className={`p-3 cursor-pointer transition-colors ${
                                            selectedIndex === index 
                                                ? 'bg-yellow-200' 
                                                : 'hover:bg-yellow-100'
                                        }`}
                                        onClick={() => handleSelectCustomer(customer)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div className="text-xs font-medium text-gray-800">
                                            {customer.customerName}
                                        </div>
                                        <div className='flex'>
                                            <div className="w-25 text-xs text-gray-600 mt-1">
                                                {customer.orgNr || customer.organisationNr || 'Inget org.nr'}
                                            </div>
                                            <div className="w-20 text-xs text-gray-600 mt-1">
                                                {customer.mobilePhone || customer.telephone}
                                            </div>
                                            <div className="w-20 text-xs text-gray-600 mt-1">
                                                {customer.street1}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-4 mt-6 mb-3 pt-4 justify-end mx-10">
                        <button
                            onClick={onClose}
                            className="shadow-md/30 text-xs text-white bg-orange-400 hover:bg-orange-600 px-10 p-[5px]"
                        >
                            Avbryt
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
