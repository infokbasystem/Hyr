import React, { useContext, useLayoutEffect } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useParams, useBlocker } from "react-router";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Printer, Search, Save, Trash2, RotateCcw } from 'lucide-react';

import ActionButton from '../../components/ActionButton';
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
import { getSharedRequest } from '../../lib/sharedRequest';

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
    const [loading, setLoading] = useState(true);
    const [listsLoaded, setListsLoaded] = useState(false);
    const [itemCategories, setItemCategories] = useState([]);
    const [reservationFormOptions, setReservationFormOptions] = useState({ itemTypes: [] });

    const { openPdfPreview, setBadges, markStale, clearStale, showPdfPanel, closePdfPreview } = usePdf();

    const skipUnsavedGuardRef = useRef(false);

    const defaultBadges = [
        { text: 'Epostadress finns', color: '#56983cff' }
    ];

    const isVehicleEnabledForOffice = (reservationFormOptions.itemTypes || [])
        .some(itemType => (itemType?.code || '').toUpperCase() === 'VEHICLE');


    const hasUnsavedChanges = () => {
        if (skipUnsavedGuardRef.current) {
            return false;
        }
        
        if (!originalReservation) return true;
        if (!reservation) return false;
        const isSame = JSON.stringify(reservation) !== JSON.stringify(originalReservation);
        console.log('hasUnsavedChanges:', isSame);
        return isSame;
    };


    const handleUnsavedWarningConfirm = () => {
        setShowUnsavedWarning(false);

        if (navigationBlocker.state === 'blocked') {
            navigationBlocker.proceed();
        }
    };

    const handleUnsavedWarningClose = () => {
        setShowUnsavedWarning(false);

        if (navigationBlocker.state === 'blocked') {
            navigationBlocker.reset();
        }
    };

    const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
        return hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname;
    });

    useEffect(() => {
        if (navigationBlocker.state === 'blocked') {
            setShowUnsavedWarning(true);
        }
    }, [navigationBlocker.state]);

    useEffect(() => {
        function handleBeforeUnload(event) {
            if (!hasUnsavedChanges()) {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [reservation, originalReservation]);

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

    const handleBackClick = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        window.close();
    };


    const getReservationById = async (id, { dedupe = false, isActive = () => true } = {}) => {
        console.log('getReservationById', id);
        if (id === 'new') {
            const newReservation = {
                id: 0,
                customerName: 'Allan',
                customerOrgNr: '',
                mobilePhone: '',
                driverName: '',
                pickUpBy: '',
                telephoneWorkplace: '',
                deliveryPlace: '',
                customerMarking: '',
                note: '',
                reservationItems: []
            };
            setReservation(newReservation);
            skipUnsavedGuardRef.current = false;
            return newReservation;
        }
        
        const fetchReservation = async () => {
            const queryParams = '';
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

            return { ...data, attachments };
        };

        try {
            const reservationData = dedupe
                ? await getSharedRequest(`reservation:${id}`, fetchReservation)
                : await fetchReservation();

            if (!isActive()) {
                return reservationData;
            }

            setReservation(reservationData);
            setOriginalReservation(JSON.parse(JSON.stringify(reservationData)));
            skipUnsavedGuardRef.current = false;
            try { setBadges && setBadges(defaultBadges); } catch (e) { /* ignore if unavailable */ }
            return reservationData;
        }
        catch (error) {
            if (!isActive()) {
                return null;
            }
            
            console.error('Error getting reservation by ID:', error);
            navigate('/something-went-wrong');
            return null;
        }
    }

    const getReservationFormOptions = async ({ dedupe = false, isActive = () => true } = {}) => {
        const fetchFormOptions = async () => {
            const response = await apiClient.get('/reservation/form-options');
            return response?.data || { itemTypes: [] };
        };

        try {
            const formOptions = dedupe
                ? await getSharedRequest('reservation-form-options', fetchFormOptions)
                : await fetchFormOptions();

            if (!isActive()) {
                return formOptions;
            }

            setReservationFormOptions(formOptions);
            return formOptions;
        } catch (error) {
            if (!isActive()) {
                return { itemTypes: [] };
            }

            console.error('Error getting reservation form options:', error);
            setReservationFormOptions({ itemTypes: [] });
            return { itemTypes: [] };
        }
    }

    const submitReservation = async (e) => {
        e?.preventDefault?.();

        if (!reservation) {
            return;
        }

        const reservationData = { ...reservation };

        try {
            let reservationId = reservation.id;

            // POST to create/update reservation
            const res = await apiClient.post('/reservation', reservationData);
            reservationId = res.data;

            // Refresh the reservation data from API
            const refreshedReservation = await getReservationById(reservationId, { dedupe: false });
            setReservation(refreshedReservation);
            setOriginalReservation(JSON.parse(JSON.stringify(refreshedReservation)));
            setMessages([{ type: 'success', text: 'Bokningen sparad' }]);

            // Navigate if ID changed (from new → ID)
            if (`${params.id}` !== `${reservationId}`) {
                skipUnsavedGuardRef.current = true;
                navigate(`/operations/reservation/${reservationId}`, { replace: true });
            }

            clearStale?.();
            // Reload the PDF after successful save without triggering unsaved warning
            if (showPdfPanel) {
                await getPdf({ ignoreUnsaved: true });
            }
        } catch (error) {
            const errorText = error?.response?.data ?? error?.message;
            setMessages([{ type: 'error', text: errorText }]);
        }
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


    // Initial data fetching - runs when ID changes
    useEffect(() => {
        let isActive = true;
        const id = params.id === 'new' ? 'new' : params.id;
        
        setLoading(true);
        Promise.all([
            getReservationFormOptions({ dedupe: true, isActive: () => isActive }),
            getReservationById(id, { dedupe: true, isActive: () => isActive })
        ])
            .finally(() => {
                if (isActive) {
                    setLoading(false);
                }
            });
        
        return () => {
            isActive = false;
        };
    }, [params.id]);

    // Cleanup: close PDF panel when component unmounts (navigating away)
    useEffect(() => {
        return () => {
            closePdfPreview?.();
        };
    }, [closePdfPreview]);



    if (loading) {
        return (
            <div className="relative flex flex-col h-full md:px-[clamp(8px,5vw,10vw)] animate-pulse">
                <div className="mt-1 flex h-full items-stretch">
                    {/* Sidebar skeleton */}
                    <aside className="mt-6 pr-3 flex flex-col w-70 border-r border-gray-300 mb-8">
                        <div className="space-y-3 px-2 pb-4">
                            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                        <hr className="border-gray-200" />
                        <div className="space-y-3 px-2 pt-4">
                            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
                            <div className="h-6 bg-gray-200 rounded" />
                            <div className="h-6 bg-gray-200 rounded" />
                        </div>
                    </aside>
                    {/* Main area skeleton */}
                    <div className="flex-grow pl-10">
                        <div className="h-4 bg-gray-200 rounded w-40 mb-6" />
                        {/* Action buttons row */}
                        <div className="flex gap-4 mb-8">
                            <div className="h-8 bg-gray-200 rounded w-20" />
                            <div className="h-8 bg-gray-200 rounded w-20" />
                            <div className="h-8 bg-gray-200 rounded w-24" />
                        </div>
                        {/* Form fields */}
                        <div className="grid grid-cols-[350px_300px_380px_1fr] gap-15 ml-3">
                            <div className="space-y-3">
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                            </div>
                            <div className="space-y-3">
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                            </div>
                            <div className="space-y-3">
                                <div className="h-15 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-15 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full md:px-[clamp(8px,5vw,10vw)]">

            {/* Customer Search Modal */}
            <CustomerSearchModal
                isOpen={showCustomerSearch}
                onClose={() => setShowCustomerSearch(false)}
                onSelectCustomer={handleSelectCustomer}
            />

            {/* Unsaved Changes Warning Modal */}
            <ConfirmationModal
                isOpen={showUnsavedWarning}
                onClose={handleUnsavedWarningClose}
                onConfirm={handleUnsavedWarningConfirm}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vänligen spara fakturan innan du fortsätter."
                confirmText="Fortsätt"
                cancelText="Stanna kvar"
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

            <div className='mt-1 flex h-full items-stretch'>

                <aside className="mt-6 pr-3 flex flex-col w-70 border-r border-gray-300 mb-8">
                    <div className="space-y-4 pr-0 pb-4 ml-2">
                        <h2 className="text-sm text-center text-gray-500">Info</h2>
                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                {reservation?.createdDate && (
                                    <>
                                        <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                            <span>Skapad:</span>
                                        </div>
                                        <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                            {new Date(reservation.createdDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                            {reservation?.createdByUserName && `av ${formatUserName(reservation.createdByUserName)}`}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                {reservation?.modifiedDate && (
                                    <>
                                        <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                            <span>Redigerad:</span>
                                        </div>
                                        <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                            {new Date(reservation.modifiedDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                            {reservation?.modifiedByUserName && `av ${formatUserName(reservation.modifiedByUserName)}`}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-300 dark:border-white" />

                    <h2 className="text-sm text-center text-gray-500 pt-4">Meddelanden</h2>
                    {messages.length == 0 ? (
                        <p className='text-xs text-center font-light mt-4'>Inga meddelanden</p>
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
                </aside>

                <div className='flex-grow pl-10'>
                    <h2 className="pb-3 text-sm text-gray-500 tracking-[0.10em] font-semibold">{reservation?.id ? (<>BOKNING <span className="ml-2">Nr. {reservation?.id}</span></>) : ("Ny bokning")}</h2>

                    <form onSubmit={submitReservation} autoComplete='off'>
                        <div className="flex justify-between w-full mb-6">
                            <div className='flex items-center gap-5 flex-wrap'>
                                <ActionButton
                                    label="Tillbaka"
                                    icon={ArrowLeft}
                                    onClick={handleBackClick}
                                    accent="sky"
                                />
                                <ActionButton
                                    label="Spara"
                                    icon={Save}
                                    onClick={submitReservation}
                                    accent="lime"
                                />
                                {reservation?.id != 0 && (
                                    <ActionButton
                                        label="Skriv ut"
                                        icon={Printer}
                                        onClick={getPdf}
                                        accent="sky"
                                    />
                                )}
                                <ActionButton
                                    label="Välj kund"
                                    icon={Search}
                                    onClick={() => setShowCustomerSearch(true)}
                                    accent="teal"
                                />
                                <div className='ml-20 flex items-center flex-wrap gap-3'>
                                    <ActionButton
                                        label="Lämna ut"
                                        icon={ArrowRight}
                                        onClick={() => { }}
                                        accent="yellow"
                                    />
                                    <ActionButton
                                        label="Återlämna"
                                        icon={RotateCcw}
                                        onClick={() => { }}
                                        accent="yellow"
                                    />
                                    <ActionButton
                                        label="Checka in"
                                        icon={CheckCircle2}
                                        onClick={() => { }}
                                        accent="yellow"
                                    />
                                </div>

                            </div>
                            <div className='flex items-center gap-5'>
                                {reservation?.id != 0 && (
                                    <ActionButton
                                        label="Radera"
                                        icon={Trash2}
                                        onClick={handleDeleteClick}
                                        accent="rose"
                                    />
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
                            {isVehicleEnabledForOffice && (
                                <span id="driver-info">
                                    <LabeledInput
                                        label="Förare"
                                        value={reservation?.driverName || ''}
                                        onChange={(e) => handleChange('driverName', e)}
                                        labelWidth="w-20" />
                                    <LabeledInput
                                        label="Förare, tfn"
                                        value={reservation?.telephoneWorkplace || ''}
                                        onChange={(e) => handleChange('telephoneWorkplace', e)}
                                        labelWidth="w-20" />
                                    <LabeledInput
                                        label="Hämtas av"
                                        value={reservation?.pickUpBy || ''}
                                        onChange={(e) => handleChange('pickUpBy', e)}
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
                            )}
                            <span>
                                <LabeledTextArea
                                    name='internalNote'
                                    label='Notering, intern'
                                    value={reservation?.note || ''}
                                    onChange={(e) => handleChange('note', e)}
                                    labelWidth="w-18"
                                    margintop="0"
                                    height='h-15'
                                    placeholder="" />
                                <LabeledInput
                                    label="Leveransplats"
                                    value={reservation?.deliveryPlace || ''}
                                    onChange={(e) => handleChange('deliveryPlace', e)}
                                    labelWidth="w-18"
                                />
                                <LabeledTextArea
                                    name='externalNote'
                                    label='Kundmärkning'
                                    value={reservation?.customerMarking || ''}
                                    onChange={(e) => handleChange('customerMarking', e)}
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

            </div>




        </div>
    )
}

export default Reservation