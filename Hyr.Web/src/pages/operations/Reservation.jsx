import React, { useContext, useLayoutEffect } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from 'lucide-react';

import { usePdf } from '../../contexts/PdfContext';
import { formatUserName } from '../../utils/nameFormatters';
import ConfirmationModal from '../../components/ConfirmationModal';
import CustomerSearchModal from '../../components/CustomerSearchModal';

import LabeledInput from '../../components/LabeledInput';
import LabeledTextArea from '../../components/LabeledTextArea';
import ReservationItemVehicle from './ReservationItemVehicle';
import ReservationItemTrailer from './ReservationItemTrailer';
import ReservationItemLift from './ReservationItemLift';
import ReservationItemHaki from './ReservationItemHaki';
import ReservationItemAlu from './ReservationItemAlu';
import ReservationItemEquipment from './ReservationItemEquipment';
import apiClient from '../../lib/apiClient';


const Reservation = () => {
    // const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const params = useParams();
    const [reservation, setReservation] = useState(null);
    const [originalReservation, setOriginalReservation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [listsLoaded, setListsLoaded] = useState(false);
    const [itemCategories, setItemCategories] = useState([]);

    const { openPdfPreview, setBadges, markStale, clearStale, showPdfPanel, closePdfPreview } = usePdf();

    const defaultBadges = [
        { text: 'Epostadress finns', color: '#56983cff' }
    ];


    const hasUnsavedChanges = () => {
        if (!originalReservation) return true; // if we haven't loaded original data yet, consider it as having unsaved changes to prevent accidental navigation
        if (!reservation) return false;
        const isSame = JSON.stringify(reservation) !== JSON.stringify(originalReservation);
        console.log('hasUnsavedChanges:', isSame);
        return isSame;
    };


    const handleUnsavedWarningConfirm = () => {
        setShowUnsavedWarning(false);
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleSelectCustomer = (customerData) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => ({
            ...prev,
            customerId: customerData.id,
            customerOrgNr: customerData.orgNr || '',
            customerName: customerData.customerName,
            address: customerData.street1 || '',
            zipCode: customerData.zipCode || '',
            email: customerData.email || '',
            mobilePhone: customerData.mobilePhone || '',
        }));
    };

    const handleChange = (field, value) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => {
            const newItems = [...(prev.reservationItems || [])];
            newItems[index] = {
                ...newItems[index],
                [field]: value
            };
            return {
                ...prev,
                reservationItems: newItems
            };
        });
    };

    const handleRemoveItem = (index) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => ({
            ...prev,
            reservationItems: prev.reservationItems.filter((_, i) => i !== index)
        }));
    };

    const handleAddItem = (itemTypeCode) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => {
            const newItem = {
                itemTypeCode: itemTypeCode,
                bookedFrom: '',
                bookedTo: '',
                actualFrom: '',
                actualTo: ''
            };
            return {
                ...prev,
                reservationItems: [...(prev.reservationItems || []), newItem]
            };
        });
    };

    const handleSaveOrClose = async (e) => {
        e.preventDefault();
        if (hasUnsavedChanges()) {
            await submitReservation(e);
        } else {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        }
    };


    const getReservationById = async (id) => {
        console.log('getReservationById', id);
        if (id === 'new') {
            const newReservation = {
                id: 0,
                customerName: 'Allan',
                customerOrgNr: '',
                mobilePhone: '',
                reservationItems: []
            };
            setReservation(newReservation);
            return newReservation;
        }
        try {
            const queryParams = ''; //calculationId ? `?calculationId=${calculationId}` : '';
            const response = await apiClient.get(`/reservation/${id}${queryParams}`);
            const data = response.data;

            const attachments = (
                Array.isArray(data?.attachments)
                    ? data.attachments
                    : []
            ).map(att => ({
                ...att,
                url: att.path ?? ''
            }));

            const reservationData = { ...data, attachments };
            setReservation(reservationData);
            setOriginalReservation(JSON.parse(JSON.stringify(reservationData)));
            // pass the default badges into PdfContext (can be updated later)
            try { setBadges && setBadges(defaultBadges); } catch (e) { /* ignore if unavailable */ }
            // setAttachedFiles(attachments.map(f => ({ ...f })));
            return reservationData;
        }
        catch (error) {
            console.error('Error getting reservation by ID:', error);
            navigate('/something-went-wrong');
            // setMessages([{ type: 'error', text: 'Ett fel uppstod vid hämtning av bokningen' }]);
            return null;
        }
    }

    const submitReservation = async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        if (!reservation) {
            console.error('No reservation data to submit');
            return;
        }
        console.log('reservation:', reservation);

        const reservationData = { ...reservation };
        let res;
        try {
            res = await apiClient.post('/reservation', reservationData);
        } catch (error) {
            const errorText = error?.response?.data ?? error?.message;
            setMessages([{ type: 'error', text: errorText }]);
            return;
        }
        const data = res.data;
        console.log('reservation updated:', data);
        await getReservationById(data);
        window.history.replaceState({}, '', `/operations/reservation/${data}`);
        clearStale?.();
        // Reload the PDF after successful save without triggering unsaved warning
        if (showPdfPanel) {
            await getPdf({ ignoreUnsaved: true });
        }
        setMessages([{ type: 'success', text: 'Bokningen sparad' }]);
    };

    const deleteReservation = async () => {
        if (!reservation?.id) {
            console.error('No reservation ID to delete');
            return;
        }

        setShowDeleteConfirm(false);

        try {
            await apiClient.delete(`/reservation/${reservation.id}`);
        } catch (error) {
            const errorText = error?.response?.data;
            if (errorText) {
                setMessages([{ type: 'error', text: errorText || 'Kunde inte ta bort förfrågan' }]);
                return;
            }
            console.error('Error deleting reservation:', error);
            setMessages([{ type: 'error', text: 'Ett fel uppstod vid borttagning' }]);
            return;
        }
        setMessages([{ type: 'success', text: 'Fakturan borttagen' }]);
        // Navigate back to a list or home page after deletion
        setTimeout(() => {
            navigate('/sales/inquiries');
        }, 1000);
    };

    const getPdf = async ({ ignoreUnsaved = false } = {}) => {
        if (!reservation) return;

        if (!ignoreUnsaved && hasUnsavedChanges()) {
            // setPendingAction('pdf');
            setShowUnsavedWarning(true);
            return;
        }

        // Open the PDF panel immediately
        openPdfPreview('');

        try {
            const res = await apiClient.get(`/pdf/reservation/${reservation.id}`, {
                responseType: 'blob',
            });
            console.log('Response ok:', true, 'content-type:', res.headers['content-type']);
            const blob = res.data;
            console.log('Blob size:', blob.size, 'type:', blob.type);
            const url = URL.createObjectURL(blob);
            openPdfPreview(url); // update the panel with the real PDF
        } catch (error) {
            console.error('Error getting reservation PDF:', error);
            // Optional: toast.error('Kunde inte ladda PDF');
            // Optional: keep panel open to show an error state in PdfPanel
        }
    };


    // Initial data fetching - runs once on mount
    useEffect(() => {
        if (params.id === 'new') {
            getReservationById('new');
        } else {
            getReservationById(params.id);
        }
    }, []);

    // Cleanup: close PDF panel when component unmounts (navigating away)
    useEffect(() => {
        return () => {
            closePdfPreview?.();
        };
    }, [closePdfPreview]);



    return (
        <div className="relative flex flex-col h-full p-2">
            <h2 className="ml-5 pb-2 text-sm text-gray-700">{reservation?.id ? (<>Bokning <span className="text-red-500">{reservation?.id}</span></>) : ("Ny bokning")}</h2>

            {/* Customer Search Modal */}
            <CustomerSearchModal
                isOpen={showCustomerSearch}
                onClose={() => setShowCustomerSearch(false)}
                onSelectCustomer={handleSelectCustomer}
            />

            {/* Unsaved Changes Warning Modal */}
            <ConfirmationModal
                isOpen={showUnsavedWarning}
                onClose={() => {
                    setShowUnsavedWarning(false);
                    setPendingAction(null);
                }}
                onConfirm={handleUnsavedWarningConfirm}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vänligen spara fakturan innan du fortsätter."
                confirmText="Jag förstår"
                cancelText="Avbryt"
                isDestructive={false}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50 z-40" />
                    <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={() => setShowDeleteConfirm(false)}>
                        <div
                            className="relative bg-white rounded-sm shadow-xl max-w-xl w-full mx-4 p-6"
                            style={{ background: 'rgb(255, 255, 234)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative flex items-center justify-center mb-4">
                                <h2 className="text-sm font-semibold text-center">
                                    BEKRÄFTA BORTTAGNING
                                </h2>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="absolute right-0 text-gray-400 hover:text-gray-600 text-l leading-none mb-1"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="mx-10 mt-7">
                                <p className="text-xs text-gray-700 mb-6">
                                    Är du säker på att du vill ta bort denna bokning? Denna åtgärd kan inte ångras.
                                </p>
                                <div className="flex gap-4 mt-6 mb-3 pt-4 justify-end">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="shadow-md/30 text-xs text-white bg-orange-400 hover:bg-orange-600 px-10 p-[5px]"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        onClick={deleteReservation}
                                        className="shadow-md/30 text-xs text-white bg-red-600 hover:bg-red-800 px-10 p-[5px]"
                                    >
                                        Ta bort
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className='flex h-full items-stretch'>

                <div className='flex-grow pe-10 py-2 ml-2'>
                    <form onSubmit={submitReservation} autoComplete='off'>
                        <div className="flex justify-between w-full mb-6">
                            <div className='flex items-center space-x-4'>
                                <button
                                    type='button'
                                    onClick={handleSaveOrClose}
                                    className={`w-25 shadow-md/30 text-xs text-white ${hasUnsavedChanges() ? 'bg-lime-700 hover:bg-lime-900' : 'bg-orange-400 hover:bg-orange-500'} px-5 p-[5px]`}>
                                    {hasUnsavedChanges() ? 'Spara' : 'Stäng'}
                                </button>
                                {reservation?.id != 0 && (
                                    <button
                                        type="button"
                                        onClick={getPdf}
                                        className="w-25 ml-5 shadow-md/30 text-xs text-gray bg-blue-200 hover:bg-blue-300 px-4 py-[5px]">
                                        Skriv ut
                                    </button>
                                )}
                                <button
                                    type='button'
                                    className="w-30 ml-5 shadow-md/30 text-xs text-gray bg-lime-300 hover:bg-lime-400 px-4 py-[5px]"
                                    onClick={() => setShowCustomerSearch(true)}>
                                    Välj kund
                                </button>
                                <button
                                    type='button'
                                    className="W-23 ml-20 shadow-md/30 text-xs text-gray bg-amber-200 hover:bg-amber-300 px-4 py-[5px]">
                                    Lämna ut
                                </button>
                                <button
                                    type='button'
                                    className="W-23 shadow-md/30 text-xs text-gray bg-amber-200 hover:bg-amber-300 px-4 py-[5px]">
                                    Återlämna
                                </button>
                                <button
                                    type='button'
                                    className="w-23 shadow-md/30 text-xs text-gray bg-amber-200 hover:bg-amber-300 px-4 py-[5px]">
                                    Checka in
                                </button>
                            </div>
                            <div className='flex items-center space-x-4'>
                                {reservation?.id != 0 && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteClick}
                                        className="shadow-md/30 text-xs text-white bg-red-700 hover:bg-red-800 px-5 p-[5px] ml-5">
                                        Radera
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className='grid grid-cols-[350px_300px_380px_1fr] gap-15 ml-3'>
                            <span>
                                <LabeledInput
                                    label="Namn"
                                    value={reservation?.customerName || ''}
                                    labelWidth="w-20"
                                    disabled={true} />
                                <LabeledInput
                                    label="Pers./org.nr"
                                    value={reservation?.customerOrgNr || ''}
                                    labelWidth="w-20"
                                    disabled={true} />
                                <LabeledInput
                                    label="Mobiltelefon"
                                    value={reservation?.mobilePhone || ''}
                                    onChange={(e) => handleChange('mobilePhone', e)}
                                    labelWidth="w-20" />
                                <LabeledInput
                                    label="Email"
                                    value={reservation?.email || ''}
                                    onChange={(e) => handleChange('email', e)}
                                    labelWidth="w-20" />
                            </span>
                            <span>
                                <LabeledInput
                                    label="Förare"
                                    value={reservation?.driverName || ''}
                                    onChange={(e) => handleChange('driverName', e)}
                                    labelWidth="w-20" />
                                <LabeledInput
                                    label="Förare, tfn"
                                    value={reservation?.driverTelephone || ''}
                                    onChange={(e) => handleChange('driverTelephone', e)}
                                    labelWidth="w-20" />
                                <LabeledInput
                                    label="Körkortsnr."
                                    value={reservation?.driverLicenceNr || ''}
                                    onChange={(e) => handleChange('driverLicenceNr', e)}
                                    labelWidth="w-20" />
                                <LabeledInput
                                    label="Referens"
                                    value={reservation?.reference || ''}
                                    onChange={(e) => handleChange('reference', e)}
                                    labelWidth="w-20" />
                            </span>
                            <span>
                                <LabeledTextArea
                                    name='internalNote'
                                    label='Notering, intern'
                                    value={reservation?.internalNote || ''}
                                    onChange={(e) => handleChange('internalNote', e)}
                                    labelWidth="w-18"
                                    margintop="0"
                                    height='h-15'
                                    placeholder="" />
                                <LabeledTextArea
                                    name='externalNote'
                                    label='Notering, kund'
                                    value={reservation?.externalNote || ''}
                                    onChange={(e) => handleChange('externalNote', e)}
                                    labelWidth="w-18"
                                    margintop="0"
                                    height='h-15'
                                    placeholder="" />
                            </span>
                        </div>

                        <div className="flex items-center space-x-2 ml-3 mt-4">
                            <span className="text-xs text-gray-700 mr-2">Lägg till:</span>
                            <button
                                type="button"
                                className="text-xs text-gray-700 border border-blue-300 hover:bg-blue-50 px-3 py-1"
                                onClick={() => handleAddItem('VEHICLE')}
                            >
                                PERSONBIL
                            </button>
                            <button
                                type="button"
                                className="text-xs text-gray-700 border border-blue-300 hover:bg-blue-50 px-3 py-1"
                            >
                                SLÄP
                            </button>
                            <button
                                type="button"
                                className="text-xs text-gray-700 border border-blue-300 hover:bg-blue-50 px-3 py-1"
                            >
                                LIFT
                            </button>
                            <button
                                type="button"
                                className="text-xs text-gray-700 border border-blue-300 hover:bg-blue-50 px-3 py-1"
                            >
                                HAKI
                            </button>
                            <button
                                type="button"
                                className="text-xs text-gray-700 border border-blue-300 hover:bg-blue-50 px-3 py-1"
                            >
                                ALU-STÄLLNING
                            </button>
                            <button
                                type="button"
                                className="text-xs text-gray-700 border border-blue-300 hover:bg-blue-50 px-3 py-1"
                            >
                                UTRUSTNING
                            </button>
                        </div>

                        {/* Reservation Items List */}
                        <div className="ml-3 mt-6 space-y-3">
                            {reservation?.reservationItems?.map((item, index) => {
                                const itemTypeCode = item.itemTypeCode?.toUpperCase();

                                // Render appropriate component based on ItemTypeCode
                                switch (itemTypeCode) {
                                    case 'VEHICLE':
                                        return (
                                            <ReservationItemVehicle
                                                key={item.id || index}
                                                item={item}
                                                index={index}
                                                onChange={handleItemChange}
                                                onRemove={handleRemoveItem}
                                                insuranceCompanies={[]}
                                                itemCategories={itemCategories}
                                            />
                                        );
                                    case 'TRAILER':
                                        return (
                                            <ReservationItemTrailer
                                                key={item.id || index}
                                                item={item}
                                                index={index}
                                                onChange={handleItemChange}
                                                onRemove={handleRemoveItem}
                                                itemCategories={itemCategories}
                                            />
                                        );
                                    case 'LIFT':
                                        return (
                                            <ReservationItemLift
                                                key={item.id || index}
                                                item={item}
                                                index={index}
                                                onChange={handleItemChange}
                                                onRemove={handleRemoveItem}
                                                itemCategories={itemCategories}
                                            />
                                        );
                                    case 'HAKI':
                                        return (
                                            <ReservationItemHaki
                                                key={item.id || index}
                                                item={item}
                                                index={index}
                                                onChange={handleItemChange}
                                                onRemove={handleRemoveItem}
                                                itemCategories={itemCategories}
                                            />
                                        );
                                    case 'ALU':
                                        return (
                                            <ReservationItemAlu
                                                key={item.id || index}
                                                item={item}
                                                index={index}
                                                onChange={handleItemChange}
                                                onRemove={handleRemoveItem}
                                                itemCategories={itemCategories}
                                            />
                                        );
                                    case 'EQUIPMENT':
                                        return (
                                            <ReservationItemEquipment
                                                key={item.id || index}
                                                item={item}
                                                index={index}
                                                onChange={handleItemChange}
                                                onRemove={handleRemoveItem}
                                                itemCategories={itemCategories}
                                            />
                                        );
                                    default:
                                        return null;
                                }
                            })}
                        </div>

                    </form>
                </div>

                {/* Right bar */}
                <div className="flex flex-col w-70 border-l border-gray-300 px-4 py-2 mb-20">
                    <div className="space-y-3">
                        <h2 className="text-sm text-center text-gray-500">Info</h2>
                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                {reservation?.createdDate && (
                                    <>
                                        <div className="text-gray-500">
                                            <span className="font-medium">Skapad:</span>
                                        </div>
                                        <div className="text-gray-700">
                                            {new Date(reservation.createdDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-gray-500">
                                            {reservation?.createdByUserName && `av ${formatUserName(reservation.createdByUserName)}`}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                {reservation?.modifiedDate && (
                                    <>
                                        <div className="text-gray-500">
                                            <span className="font-medium">Redigerad:</span>
                                        </div>
                                        <div className="text-gray-700">
                                            {new Date(reservation.modifiedDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-gray-500">
                                            {reservation?.modifiedByUserName && `av ${formatUserName(reservation.modifiedByUserName)}`}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <hr className="mt-7 border-gray-300 dark:border-white" />
                    <h2 className="text-sm text-center text-gray-500 mt-5">Meddelanden</h2>
                    {messages.length == 0 ? (
                        <p className='text-xs text-center font-light mt-5'>Inga meddelanden</p>
                    ) : (
                        <ul className="mt-2 space-y-2">
                            {messages.map((message, index) => (
                                <li key={index} className={`text-center text-xs p-2 rounded border border-gray-200 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {message.text}
                                </li>
                            ))}
                        </ul>
                    )}
                    <hr className="mt-7 border-gray-300 dark:border-white" />
                    {/* {inquiry && attachedFiles && (
                        <FileList
                            files={attachedFiles}
                            onRemove={handleRemoveFile}
                            onAdd={handleAddFile}
                            onEdit={handleEditFile}
                            paths={[
                                { id: 'docs', name: 'Dokument' },
                                { id: 'specs', name: 'Specifikationer' },
                                { id: 'designs', name: 'Design' }
                            ]}
                            entityId={inquiry?.id}
                            entityType="inquiry"
                        />
                    )} */}
                </div>

            </div>




        </div>
    )
}

export default Reservation