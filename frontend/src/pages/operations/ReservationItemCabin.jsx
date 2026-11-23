import React, { useRef } from 'react';
import LabeledInput from '../../components/LabeledInput';
import LabeledTextArea from '../../components/LabeledTextArea';
import LabeledReactSelect from '../../components/LabeledReactSelect';
import LabeledCheckbox from '../../components/LabeledCheckbox';
import ReservationItemDateTimeFields from './ReservationItemDateTimeFields';
import { Trash2 } from 'lucide-react';
import ArticleSearchInput from '../../components/ArticleSearchInput';

const ReservationItemCabin = ({
    item,
    index,
    onRemove,
    onChange,
    cabinOptions = [],
    onCabinSelect,
    isLoadingCabins = false,
    isLoadingPrices = false,
    articleOptions = [],
    isLoadingArticles = false,
    defaultBookedFromTime = '',
    defaultBookedToTime = '',
}) => {
    const pendingArticleFocus = useRef(null);
    const handleChange = (field, value) => {
        onChange(index, field, value);
    };
    const options = item?.itemId && !cabinOptions.some(cabin => String(cabin.id) === String(item.itemId))
        ? [{ id: item.itemId, name: item.itemName || item.itemNr || String(item.itemId), category: item.category || '' }, ...cabinOptions]
        : cabinOptions;
    const articles = item?.reservationItemArticles || [];
    const articlesDisabled = isLoadingPrices || isLoadingArticles;
    const getArticleOption = article => articleOptions.find(option => String(option.id) === String(article.articleId));
    const getArticleRowKey = (article, rowIndex) => article._draftKey || `row:${rowIndex}`;
    const updateArticleRow = (rowKey, update) => {
        handleChange('reservationItemArticles', articles.map((article, rowIndex) => getArticleRowKey(article, rowIndex) === rowKey
            ? update(article)
            : article));
    };
    const addArticleRow = () => {
        const draftKey = crypto.randomUUID();
        pendingArticleFocus.current = draftKey;
        handleChange('reservationItemArticles', [
            ...articles.map(article => Object.fromEntries(Object.entries(article).filter(([key]) => key !== '_duplicateError'))),
            { _draftKey: draftKey, articleId: null, articleNr: '', name: '', quantity: 1, unitPrice: null },
        ]);
    };
    const selectArticle = (rowKey, selectedArticle) => {
        const articleId = Number(selectedArticle?.id);
        if (!Number.isInteger(articleId) || articleId <= 0) {
            return;
        }
        if (articles.some((article, articleIndex) => getArticleRowKey(article, articleIndex) !== rowKey
            && String(article.articleId) === String(articleId))) {
            updateArticleRow(rowKey, article => ({
                ...article,
                articleId: null,
                articleNr: '',
                name: '',
                quantity: 1,
                unitPrice: null,
                _duplicateError: true,
            }));
            return;
        }
        updateArticleRow(rowKey, article => ({
            ...Object.fromEntries(Object.entries(article).filter(([key]) => key !== '_duplicateError')),
            articleId,
            articleNr: selectedArticle.articleNr || '',
            name: selectedArticle.name || selectedArticle.description || '',
            quantity: article.quantity || 1,
            unitPrice: selectedArticle.price ?? null,
        }));
    };

    return (
        <div className="w-full min-w-0 bg-yellow-50/50 border border-gray-300 rounded-sm p-3 pb-1 mb-3">
            <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                <div className="w-[270px] max-w-full">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">{item?.itemName || 'Cabin'}</h3>
                    <div className="space-y-1">
                        <LabeledReactSelect
                            label="Bod"
                            value={item?.itemId ?? ''}
                            items={options}
                            onChange={(value) => onCabinSelect(index, value)}
                            placeholder="-"
                            labelWidth="w-20"
                            disabled={isLoadingCabins}
                            optionCategoryKey="category"
                            optionCategoryWidth="9rem"
                            fitMenuToContent
                        />
                        {/* <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Kategori</label>
                            <span className="text-xs">{item?.category}</span>
                        </div> */}
                        {/* <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Fabrikat</label>
                            <span className="text-xs">{item?.manufacturer} {item?.model}</span>
                        </div> */}
                        {/* <LabeledReactSelect
                            label="Debitkategori"
                            value={item?.debitCategoryId || ''}
                            onChange={(value) => handleChange('debitCategoryId', value)}
                            items={itemCategories || []}
                            placeholder="-"
                            labelWidth="w-20"
                            margintop="1"
                        /> */}
                    </div>
                    {item?.itemNote && (
                        <p className="text-xs text-gray-500 mt-2">{item.itemNote}</p>
                    )}
                    <div className="mt-4 ml-20">
                        {/* <h3 className="text-xs font-bold mb-2">&nbsp;</h3> */}
                        <LabeledCheckbox
                            label="Incheckad"
                            checked={item?.isCheckedIn || false}
                            onChange={(checked) => handleChange('isCheckedIn', checked)}
                        />
                    </div>
                </div>

                <div className="w-[538px] max-w-full min-w-0 pr-5">
                    <h3 className="text-xs font-bold mb-1 uppercase tracking-[0.1em] text-gray-500">Bokningsinfo</h3>
                    <div className="">
                        <div className="[&>div]:flex-wrap">
                            <ReservationItemDateTimeFields
                                item={item}
                                onFieldChange={handleChange}
                                defaultBookedFromTime={defaultBookedFromTime}
                                defaultBookedToTime={defaultBookedToTime}
                            />
                        </div>
                        <LabeledTextArea
                            label="Notering"
                            aria-label="Notering"
                            value={item?.deliveryPlaceNote || ''}
                            onChange={(value) => handleChange('deliveryPlaceNote', value)}
                            labelWidth="w-20"
                            margintop="2"
                            height='h-11'
                        />
                        {/* <LabeledInput
                            label="Hämtningsplats"
                            value={item?.pickupPlaceNote || ''}
                            onChange={(value) => handleChange('pickupPlaceNote', value)}
                            labelWidth="w-24"
                        /> */}
                    </div>
                </div>

                <div className="w-45 pr-5">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">Priser</h3>
                    <div className="">
                        {[
                            ['basePrice', 'Grundpris'],
                            ['pricePerDay', 'Pris/dag'],
                            ['pricePerWeek', 'Pris/vecka'],
                            ['pricePerMonth', 'Pris/månad'],
                        ].map(([field, label]) => (
                            <LabeledInput
                                key={field}
                                label={label}
                                type="number"
                                suffix="kr"
                                labelWidth="w-20"
                                value={item?.[field] ?? ''}
                                onChange={(value) => handleChange(field, value)}
                                disabled={isLoadingPrices}
                            />
                        ))}
                    </div>
                </div>

                <div className="min-w-0 w-80">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">Artiklar</h3>
                    <table className="w-full table-fixed border-collapse text-xs text-gray-700">
                        <colgroup>
                            <col />
                            <col className="w-10" />
                            <col className="w-20" />
                            <col className="w-8" />
                        </colgroup>
                        {/* <thead>
                            <tr className="border-b border-gray-300 text-left text-gray-500">
                                <th className="w-2/3 px-2 py-1 font-normal">Artikel</th>
                                <th className="w-20 px-2 py-1 font-normal">Antal</th>
                                <th className="w-8 px-1 py-1"><span className="sr-only">Åtgärder</span></th>
                            </tr>
                        </thead> */}
                        <tbody>
                            {articles.map((article, rowIndex) => {
                                const rowKey = getArticleRowKey(article, rowIndex);
                                const option = getArticleOption(article);
                                const articleName = option?.name
                                    ? `${option.name}${option.isActive ? '' : ' (inaktiv)'}`
                                    : article.name || (article.articleId ? `Artikel ${article.articleId}` : '');
                                const isDraft = !article.articleId;
                                return (
                                    <tr key={rowKey} className="">
                                        <td className="pr-1 align-top">
                                            {isDraft ? (
                                                <ArticleSearchInput
                                                    value={article.articleNr || ''}
                                                    onChange={value => updateArticleRow(rowKey, current => ({
                                                        ...Object.fromEntries(Object.entries(current).filter(([key]) => key !== '_duplicateError')),
                                                        articleNr: value,
                                                    }))}
                                                    onArticleSelect={selected => selectArticle(rowKey, selected)}
                                                    gridcell
                                                    autoFocus={rowKey === pendingArticleFocus.current}
                                                    onFocus={() => {
                                                        if (pendingArticleFocus.current === rowKey) {
                                                            pendingArticleFocus.current = null;
                                                        }
                                                    }}
                                                    className={articlesDisabled || !item?.itemId ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            ) : (
                                                <div className="break-words py-1">{articleName}</div>
                                            )}
                                        </td>
                                        <td className="pr-1 align-top">
                                            <LabeledInput
                                                type="number"
                                                value={isDraft ? '' : article.quantity}
                                                disabled={articlesDisabled || !item?.itemId || isDraft}
                                                aria-label={`Antal för ${articleName || article.articleNr || 'ny artikel'}`}
                                                onChange={value => updateArticleRow(rowKey, current => ({ ...current, quantity: value }))}
                                            />
                                        </td>
                                        <td className="p-0 align-top">
                                            <LabeledInput
                                                type="number"
                                                suffix="kr"
                                                value={isDraft ? '' : article.unitPrice ?? ''}
                                                disabled={articlesDisabled || !item?.itemId || isDraft}
                                                aria-label={`À-pris för ${articleName || article.articleNr || 'ny artikel'}`}
                                                onChange={value => updateArticleRow(rowKey, current => ({ ...current, unitPrice: value }))}
                                            />
                                        </td>
                                        <td className="px-1 text-center align-middle">
                                            <button
                                                type="button"
                                                aria-label={`Ta bort artikel ${article.articleNr || article.articleId || 'rad'}`}
                                                title="Ta bort rad"
                                                disabled={articlesDisabled}
                                                onClick={() => handleChange('reservationItemArticles', articles.filter((row, rowIndex) => getArticleRowKey(row, rowIndex) !== rowKey))}
                                                className="p-1 text-red-400 hover:text-red-600 disabled:opacity-50"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="">
                                <td colSpan="4" className="px-0 py-1">
                                    <button
                                        type="button"
                                        disabled={articlesDisabled || !item?.itemId}
                                        onClick={addArticleRow}
                                        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                    >
                                        + Lägg till artikel
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    {articles.some(article => article._duplicateError) && (
                        <p role="alert" className="mt-1 text-xs text-red-600">Artikeln finns redan på boden.</p>
                    )}
                </div>

            </div>

            <div className="mt-0">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                    TA BORT BOD
                </button>
            </div>
        </div>
    );
};

export default ReservationItemCabin;
