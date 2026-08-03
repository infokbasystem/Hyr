import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../lib/apiClient';

/**
 * Article search input component with autocomplete popup
 * 
 * @param {string} value - Current article number value
 * @param {function} onChange - Callback when value changes (value)
 * @param {function} onArticleSelect - Callback when article is selected (article)
 * @param {string} className - Additional CSS classes for the input
 */
const ArticleSearchInput = ({
    value,
    onChange,
    onArticleSelect,
    className = '',
    stylePreset = 'default',
    gridcell = false,
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
    const isGridCell = stylePreset === 'gridCell' || gridcell;

    const wrapperClassName = isGridCell ? 'relative' : 'relative px-1';
    const inputClassName = isGridCell
        ? `block h-full w-full border border-transparent bg-transparent pt-[5px] pb-[3px] pl-8 pr-2 text-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-0 ${className}`
        : `w-full h-full border-0 bg-transparent px-2 py-1 pl-6 text-xs focus:border focus:border-blue-400 focus:bg-white focus:outline-none ${className}`;
    const popupClassName = isGridCell
        ? 'fixed z-50 min-w-[300px] max-h-[300px] overflow-y-auto rounded-sm border border-gray-300 bg-white shadow-lg transition-opacity duration-150'
        : 'fixed z-50 min-w-[300px] max-h-[300px] overflow-y-auto rounded-sm border border-gray-300 bg-white shadow-lg transition-opacity duration-150';

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

    useEffect(() => {
        if (!showPopup) {
            return undefined;
        }

        const handleViewportChange = () => updatePopupPosition();

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [showPopup]);

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
            const response = await apiClient.get(`/article?searchTerm=${encodeURIComponent(searchTerm)}`);
            const data = response.data;
            
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
            <div className={wrapperClassName}>
                <Search
                    className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isGridCell ? 'left-2.5 h-3.5 w-3.5' : 'left-2 mt-[1px] mr-[3px] h-3 w-3'}`}
                />
                <input
                    type="text"
                    ref={inputRef}
                    value={value || ''}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    autoComplete="off"
                    className={inputClassName.trim()}
                />
            </div>

            {/* Article Search Popup - rendered with fixed positioning */}
            {showPopup && (
                <div
                    className={popupClassName}
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
