import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

/**
 * Article search input component with autocomplete popup
 * 
 * @param {string} value - Current article number value
 * @param {function} onChange - Callback when value changes (value)
 * @param {function} onArticleSelect - Callback when article is selected (article)
 * @param {string} apiUrl - Base API URL
 * @param {string} className - Additional CSS classes for the input
 */
const ArticleSearchInput = ({
    value,
    onChange,
    onArticleSelect,
    apiUrl,
    className = ''
}) => {
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const inputRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const loadingTimeoutRef = useRef(null);
    const lastSearchTermRef = useRef('');

    // Update popup position when it's shown
    const updatePopupPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setPopupPosition({
                top: rect.top,
                left: rect.right + 8
            });
        }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, []);

    const searchArticles = async (searchTerm) => {
        // Don't search if term is empty
        if (!searchTerm || searchTerm.trim() === '') {
            setShowPopup(false);
            setSearchResults([]);
            return;
        }

        // Only show popup and calculate position if not already showing
        if (!showPopup) {
            updatePopupPosition();
            setShowPopup(true);
        }

        setIsSearching(true);
        lastSearchTermRef.current = searchTerm;

        // Clear any existing loading timeout
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }

        // Only show loading indicator after 200ms (timeout is cleared when search completes)
        loadingTimeoutRef.current = setTimeout(() => {
            setShowLoadingIndicator(true);
        }, 100);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/article?searchTerm=${encodeURIComponent(searchTerm)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                throw new Error('Search failed');
            }
            const data = await response.json();
            
            // Only update results if this is still the latest search
            if (searchTerm === lastSearchTermRef.current) {
                setSearchResults(data.data || []);
            }
        } catch (error) {
            console.error('Error searching articles:', error);
            if (searchTerm === lastSearchTermRef.current) {
                setSearchResults([]);
            }
        } finally {
            if (searchTerm === lastSearchTermRef.current) {
                setIsSearching(false);
                setShowLoadingIndicator(false);
                if (loadingTimeoutRef.current) {
                    clearTimeout(loadingTimeoutRef.current);
                }
            }
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for debounced search
        searchTimeoutRef.current = setTimeout(() => {
            searchArticles(newValue);
        }, 200);
    };

    const handleArticleClick = (article) => {
        onArticleSelect(article);
        setShowPopup(false);
        setSearchResults([]);
    };

    const handleBlur = () => {
        // Close popup with delay to allow click handling
        setTimeout(() => {
            setShowPopup(false);
            setSearchResults([]);
        }, 200);
    };

    const closePopup = () => {
        setShowPopup(false);
        setSearchResults([]);
    };

    return (
        <>
            <div className="relative px-1">
                <Search
                    className="absolute left-2 top-1/2 mt-[1px] mr-[3px] -translate-y-1/2 w-3 h-3 text-gray-400"
                />
                <input
                    type="text"
                    ref={inputRef}
                    value={value || ''}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-full text-xs px-2 pl-6 py-1 bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-blue-400 ${className}`}
                />
            </div>

            {/* Article Search Popup - rendered with fixed positioning */}
            {showPopup && (
                <div
                    className="fixed z-50 bg-white border border-gray-300 shadow-lg rounded-sm min-w-[300px] max-h-[300px] overflow-y-auto transition-opacity duration-150"
                    style={{
                        top: popupPosition.top,
                        left: popupPosition.left
                    }}
                >
                    {/* <div className="sticky top-0 bg-gray-100 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                            {showLoadingIndicator ? 'Söker...' : 'Sökresultat'}
                        </span>
                        <button
                            type="button"
                            onClick={closePopup}
                            className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                            ×
                        </button>
                    </div> */}
                    <div className="min-h-[250px]">
                        {showLoadingIndicator && searchResults.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-gray-500 text-center">
                                <span className="inline-block animate-pulse">Söker...</span>
                            </div>
                        ) : searchResults.length === 0 && !isSearching ? (
                            <div className="px-3 py-4 text-xs text-gray-500 text-center">
                                Inga artiklar hittades
                            </div>
                        ) : (
                            <ul className={`transition-opacity duration-150 ${isSearching ? 'opacity-40 pointer-events-none' : ''}`}>
                                {searchResults.map((article) => (
                                    <li
                                        key={article.id}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleArticleClick(article);
                                        }}
                                    >
                                        <div className="text-xs font-medium text-gray-800">{article.articleNr}</div>
                                        <div className="text-xs text-gray-500">{article.name || article.description}</div>
                                        {article.price && (
                                            <div className="text-xs text-gray-400">{article.price.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK</div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ArticleSearchInput;
