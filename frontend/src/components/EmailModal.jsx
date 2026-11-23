import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../lib/apiClient';
import RichTextEditor from './RichTextEditor';

const EMPTY_RECIPIENTS = [];
const MAX_REQUEST_BYTES = 25_000_000;
const STALE_WARNING = 'PDF-förhandsvisningen är inaktuell. Stäng och öppna PDF:en igen innan du skickar.';

function normalizeRecipients(items) {
    const rows = (Array.isArray(items) ? items : []).map((item) => ({
        email: typeof item?.email === 'string' ? item.email : '',
        doSend: Boolean(item?.doSend),
    }));
    if (rows.length === 0 || rows[rows.length - 1].email.trim()) {
        rows.push({ email: '', doSend: false });
    }
    return rows;
}

function attachmentName(name, url) {
    if (typeof name === 'string' && name.trim()) return name;
    if (typeof url === 'string' && url && !url.startsWith('blob:') && !url.startsWith('data:')) {
        try {
            const parts = new URL(url, window.location.origin).pathname.split('/').filter(Boolean);
            const filename = decodeURIComponent(parts[parts.length - 1] || '');
            if (/\.pdf$/i.test(filename)) return filename;
        } catch {
            // Use the generic name when a URL cannot provide a PDF filename.
        }
    }
    return 'dokument.pdf';
}

function filesFromTransfer(transfer) {
    const itemFiles = Array.from(transfer?.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter(Boolean);
    return itemFiles.length ? itemFiles : Array.from(transfer?.files || []);
}

function hasFileTransfer(transfer) {
    return Array.from(transfer?.types || []).includes('Files')
        || Array.from(transfer?.items || []).some((item) => item.kind === 'file');
}

function recipientPayload(rows) {
    return rows
        .filter((row) => row.email.trim())
        .map((row) => ({ email: row.email.trim(), doSend: row.doSend }));
}

function validDocumentId(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) return null;
    const number = Number(text);
    return Number.isSafeInteger(number) && number > 0 && number <= 2147483647 ? number : null;
}

function sendErrorMessage(error) {
    const status = error?.response?.status;
    if (status === 413) return 'Meddelandet får vara högst 25 000 000 byte inklusive formulärdata.';
    if (status === 400 || status === 422) return 'Kontrollera mottagare, dokument och bilagor. E-postmeddelandet skickades inte.';
    if (status === 401 || status === 403) return 'Du saknar behörighet att skicka e-post. Logga in igen och försök på nytt.';
    if (status === 404) return 'Dokumentet kunde inte hittas. Stäng och öppna PDF:en igen.';
    if (status === 503 && typeof error?.response?.data?.message === 'string' && error.response.data.message.trim()) {
        return error.response.data.message;
    }
    return 'Det gick inte att bekräfta om e-postmeddelandet skickades. Kontrollera utskicken innan du försöker igen.';
}

function RecipientTable({ title, rows, onChange, disabled }) {
    const updateRow = (index, property, value) => {
        onChange(normalizeRecipients(rows.map((row, rowIndex) => (
            rowIndex === index ? { ...row, [property]: value } : row
        ))));
    };

    return (
        <div>
            <div className="grid grid-cols-[minmax(0,1fr)_90px_60px] border-b border-gray-300 text-tiny text-gray-700">
                <div className="px-2 py-1">{title}</div>
                <div className="px-2 py-1 text-center">Skicka</div>
                <div className="px-2 py-1 text-center">Ta bort</div>
            </div>
            {rows.map((row, index) => {
                const isEmptyRow = !row.email.trim() && index === rows.length - 1;
                return (
                    <div key={`${title}-${index}`} className="grid grid-cols-[minmax(0,1fr)_90px_60px] border-b border-gray-200 bg-white last:border-b-0">
                        <input
                            type="email"
                            className="min-w-0 px-2 py-1.5 text-xs outline-none disabled:bg-gray-100"
                            value={row.email}
                            onChange={(event) => updateRow(index, 'email', event.target.value)}
                            placeholder="namn@foretag.se"
                            aria-label={`${title} ${index + 1}`}
                            disabled={disabled}
                        />
                        <label className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={row.doSend}
                                onChange={(event) => updateRow(index, 'doSend', event.target.checked)}
                                aria-label={`Skicka till ${title.toLowerCase()} ${index + 1}`}
                                disabled={disabled}
                            />
                        </label>
                        <div className="flex items-center justify-center">
                            {!isEmptyRow && (
                                <button
                                    type="button"
                                    onClick={() => onChange(normalizeRecipients(rows.filter((_, rowIndex) => rowIndex !== index)))}
                                    className="text-[11px] text-red-700 hover:text-red-900 disabled:opacity-50"
                                    aria-label={`Ta bort ${title.toLowerCase()} ${index + 1}`}
                                    disabled={disabled}
                                >
                                    X
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function EmailModal({
    initialSubject = '',
    initialBody = '',
    receiverList = EMPTY_RECIPIENTS,
    ccMailList = EMPTY_RECIPIENTS,
    sourceAttachmentUrl = '',
    sourceAttachmentName = '',
    invoiceId = null,
    reservationId = null,
    initialWarning = '',
    isStale = false,
    isLoadingDefaults = false,
    showDefaultsLoading = false,
    onContinueManually,
    onClose,
    onSent,
}) {
    const receiverKey = JSON.stringify(normalizeRecipients(receiverList));
    const ccKey = JSON.stringify(normalizeRecipients(ccMailList));
    const [defaults, setDefaults] = useState({ initialSubject, initialBody, receiverKey, ccKey, isLoadingDefaults });
    const [subject, setSubject] = useState(initialSubject || '');
    const [body, setBody] = useState(initialBody || '');
    const [receivers, setReceivers] = useState(() => normalizeRecipients(receiverList));
    const [ccRecipients, setCcRecipients] = useState(() => normalizeRecipients(ccMailList));
    const [editedFields, setEditedFields] = useState({ subject: false, body: false, receivers: false, ccRecipients: false });
    const [extraFiles, setExtraFiles] = useState([]);
    const [isDragOverAttachments, setIsDragOverAttachments] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [hasSent, setHasSent] = useState(false);
    const [sendError, setSendError] = useState('');
    const fileInputRef = useRef(null);
    const editorRef = useRef(null);
    const dialogRef = useRef(null);
    const sendingRef = useRef(false);
    const sentRef = useRef(false);
    const mountedRef = useRef(true);
    const sourceRef = useRef({ isStale, sourceAttachmentUrl, sourceAttachmentName, invoiceId, reservationId });

    if (defaults.initialSubject !== initialSubject || defaults.initialBody !== initialBody || defaults.receiverKey !== receiverKey || defaults.ccKey !== ccKey || defaults.isLoadingDefaults !== isLoadingDefaults) {
        const preserveEdits = defaults.isLoadingDefaults;
        if (defaults.initialSubject !== initialSubject && (!preserveEdits || !editedFields.subject)) setSubject(initialSubject || '');
        if (defaults.initialBody !== initialBody && (!preserveEdits || !editedFields.body)) setBody(initialBody || '');
        if (defaults.receiverKey !== receiverKey && (!preserveEdits || !editedFields.receivers)) setReceivers(normalizeRecipients(receiverList));
        if (defaults.ccKey !== ccKey && (!preserveEdits || !editedFields.ccRecipients)) setCcRecipients(normalizeRecipients(ccMailList));
        if (!defaults.isLoadingDefaults && isLoadingDefaults) {
            setEditedFields({ subject: false, body: false, receivers: false, ccRecipients: false });
        }
        setDefaults({ initialSubject, initialBody, receiverKey, ccKey, isLoadingDefaults });
    }

    useLayoutEffect(() => {
        sourceRef.current = { isStale, sourceAttachmentUrl, sourceAttachmentName, invoiceId, reservationId };
    }, [isStale, sourceAttachmentUrl, sourceAttachmentName, invoiceId, reservationId]);

    useEffect(() => {
        mountedRef.current = true;
        const previousFocus = document.activeElement;
        dialogRef.current?.focus();
        return () => {
            mountedRef.current = false;
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, []);

    useLayoutEffect(() => {
        if (isSending) dialogRef.current?.focus();
    }, [isSending]);

    const filename = attachmentName(sourceAttachmentName, sourceAttachmentUrl);
    const filteredReceivers = recipientPayload(receivers);
    const filteredCcRecipients = recipientPayload(ccRecipients);
    const selectedRecipients = [...filteredReceivers, ...filteredCcRecipients].filter((row) => row.doSend);
    const hasNoRecipients = selectedRecipients.length === 0;
    const hasSource = typeof sourceAttachmentUrl === 'string' && sourceAttachmentUrl.trim() !== '';

    const close = () => {
        if (!sendingRef.current) onClose?.();
    };

    const markEdited = (field) => {
        if (isLoadingDefaults) {
            setEditedFields((current) => current[field] ? current : { ...current, [field]: true });
        }
    };

    const appendFiles = (incomingFiles) => {
        if (sendingRef.current || sentRef.current) return;
        const files = Array.from(incomingFiles || []);
        if (!files.length) return;
        setExtraFiles((current) => {
            const keyFor = (file) => `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
            const seen = new Set(current.map((item) => keyFor(item.file)));
            const additions = [];
            files.forEach((file) => {
                const key = keyFor(file);
                if (!seen.has(key)) {
                    seen.add(key);
                    additions.push({ file, displayName: file.name || 'bilaga' });
                }
            });
            return [...current, ...additions];
        });
    };

    const handlePasteCapture = (event) => {
        const files = filesFromTransfer(event.clipboardData);
        if (!files.length) return;
        event.preventDefault();
        event.stopPropagation();
        appendFiles(files);
    };

    const handleDropCapture = (event) => {
        const files = filesFromTransfer(event.dataTransfer);
        if (!files.length) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragOverAttachments(false);
        appendFiles(files);
    };

    const handleSend = async (event) => {
        event.preventDefault();
        if (sendingRef.current || sentRef.current) return;
        setSendError('');

        if (isLoadingDefaults) {
            setSendError('Vänta tills e-postuppgifterna har hämtats eller välj att fortsätta manuellt.');
            return;
        }
        if (isStale) {
            setSendError(STALE_WARNING);
            return;
        }
        if (!hasSource) {
            setSendError('Ingen PDF är laddad. Stäng och öppna PDF:en igen.');
            return;
        }
        if (hasNoRecipients) {
            setSendError('Markera minst en mottagare eller kopiemottagare.');
            return;
        }
        if (selectedRecipients.some((row) => !/^[^\s<>@]+@[^\s<>@]+$/.test(row.email))) {
            setSendError('Kontrollera e-postadresserna för de markerade mottagarna.');
            return;
        }
        if (/[\r\n]/.test(subject)) {
            setSendError('Ämnet får inte innehålla radbrytningar.');
            return;
        }

        const hasInvoice = invoiceId !== null && invoiceId !== undefined && String(invoiceId).trim() !== '';
        const hasReservation = reservationId !== null && reservationId !== undefined && String(reservationId).trim() !== '';
        const documentId = validDocumentId(hasInvoice ? invoiceId : reservationId);
        if (hasInvoice === hasReservation || documentId === null) {
            setSendError('Kunde inte avgöra vilket dokument som ska skickas. Stäng och öppna PDF:en igen.');
            return;
        }

        const currentBody = editorRef.current?.getHtml() || '';
        sendingRef.current = true;
        setIsSending(true);

        try {
            let sourceBlob;
            try {
                const sourceResponse = await fetch(sourceAttachmentUrl);
                if (!sourceResponse.ok) throw new Error('PDF unavailable');
                sourceBlob = await sourceResponse.blob();
                if (!sourceBlob.size || await sourceBlob.slice(0, 5).text() !== '%PDF-') throw new Error('PDF invalid');
            } catch {
                if (mountedRef.current) setSendError('Kunde inte läsa den ursprungliga PDF-filen. Stäng och öppna PDF:en igen.');
                return;
            }

            if (!mountedRef.current) return;
            const currentSource = sourceRef.current;
            if (currentSource.isStale) {
                setSendError(STALE_WARNING);
                return;
            }
            if (currentSource.sourceAttachmentUrl !== sourceAttachmentUrl
                || currentSource.sourceAttachmentName !== sourceAttachmentName
                || currentSource.invoiceId !== invoiceId
                || currentSource.reservationId !== reservationId) {
                setSendError('PDF:en har ändrats. Stäng och öppna PDF:en igen innan du skickar.');
                return;
            }

            if (sourceBlob.size + extraFiles.reduce((total, item) => total + item.file.size, 0) >= MAX_REQUEST_BYTES) {
                setSendError('Meddelandet får vara högst 25 000 000 byte inklusive formulärdata.');
                return;
            }

            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('body', currentBody);
            formData.append('receivers', JSON.stringify(filteredReceivers));
            formData.append('ccRecipients', JSON.stringify(filteredCcRecipients));
            formData.append(hasInvoice ? 'invoiceId' : 'reservationId', String(documentId));
            formData.append('files', sourceBlob, filename);
            extraFiles.forEach((item) => {
                formData.append('files', item.file, item.displayName.trim() || item.file.name || 'bilaga');
            });

            let response;
            try {
                response = await apiClient.post('/email/send', formData);
            } catch (error) {
                if (mountedRef.current) setSendError(sendErrorMessage(error));
                return;
            }
            if (!mountedRef.current) return;

            sentRef.current = true;
            setHasSent(true);
            const data = response.data;
            const result = {
                ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
                response: data,
                invoiceId: hasInvoice ? documentId : null,
                reservationId: hasReservation ? documentId : null,
            };
            try {
                const notification = onSent?.(result);
                if (notification && typeof notification.then === 'function') {
                    Promise.resolve(notification).catch(() => {
                        console.error('Email was sent, but the page could not be updated.');
                        if (mountedRef.current) {
                            setSendError('E-postmeddelandet skickades, men sidan kunde inte uppdateras. Ladda om sidan innan du fortsätter.');
                        }
                    });
                }
            } catch {
                console.error('Email was sent, but the page could not be updated.');
                if (mountedRef.current) {
                    setSendError('E-postmeddelandet skickades, men sidan kunde inte uppdateras. Ladda om sidan innan du fortsätter.');
                }
                return;
            }
            try {
                if (mountedRef.current) onClose?.();
            } catch {
                console.error('Email was sent, but the dialog could not be closed.');
                if (mountedRef.current) {
                    setSendError('E-postmeddelandet skickades, men fönstret kunde inte stängas. Ladda om sidan.');
                }
            }
        } finally {
            sendingRef.current = false;
            if (mountedRef.current) setIsSending(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex min-h-screen items-start justify-center overflow-y-auto bg-black/50 pt-20"
            onClick={(event) => { if (event.target === event.currentTarget) close(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="email-modal-title"
                tabIndex={-1}
                className="max-h-[92vh] w-[92%] max-w-5xl overflow-y-auto rounded-sm py-6 text-gray-900 shadow-xl outline-none [&_input::placeholder]:[-webkit-text-fill-color:#9ca3af]"
                style={{ background: '#f4f3f2' }}
                onPasteCapture={handlePasteCapture}
                onDropCapture={handleDropCapture}
                onDragOver={(event) => {
                    if (hasFileTransfer(event.dataTransfer)) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'copy';
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        close();
                    } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'checkbox') {
                        event.preventDefault();
                    } else if (event.key === 'Tab') {
                        const focusable = Array.from(event.currentTarget.querySelectorAll(
                            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
                        )).filter((element) => element.getClientRects().length > 0);
                        const currentIndex = focusable.indexOf(document.activeElement);
                        if (!focusable.length) {
                            event.preventDefault();
                            dialogRef.current?.focus();
                        } else if (event.shiftKey && currentIndex <= 0) {
                            event.preventDefault();
                            focusable[focusable.length - 1].focus();
                        } else if (!event.shiftKey && (currentIndex === -1 || currentIndex === focusable.length - 1)) {
                            event.preventDefault();
                            focusable[0].focus();
                        }
                    }
                }}
            >
                <div className="relative mb-4 flex items-center justify-center">
                    <h2 id="email-modal-title" className="text-center text-sm font-semibold">Skicka e-post</h2>
                    <button
                        type="button"
                        onClick={close}
                        disabled={isSending}
                        aria-label="Stäng"
                        className="absolute right-0 mb-1 mr-5 text-base leading-none text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSend} noValidate>
                    <div className="mx-10 mt-7 grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.1fr]">
                        <div>
                            <RecipientTable title="Mottagare" rows={receivers} onChange={(rows) => { markEdited('receivers'); setReceivers(rows); }} disabled={isSending || hasSent} />
                            <div className="mt-6">
                                <RecipientTable title="Kopia" rows={ccRecipients} onChange={(rows) => { markEdited('ccRecipients'); setCcRecipients(rows); }} disabled={isSending || hasSent} />
                            </div>

                            <div
                                className={`mt-4 rounded-sm border p-3 transition-colors ${isDragOverAttachments ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
                                onDragEnter={(event) => {
                                    if (hasFileTransfer(event.dataTransfer) && !sendingRef.current) setIsDragOverAttachments(true);
                                }}
                                onDragOver={(event) => {
                                    if (hasFileTransfer(event.dataTransfer) && !sendingRef.current) setIsDragOverAttachments(true);
                                }}
                                onDragLeave={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragOverAttachments(false);
                                }}
                                tabIndex={0}
                                aria-label="Bilagor"
                            >
                                <div className="mb-2 text-xs font-semibold">Bilagor</div>
                                <div className="mb-2 text-xs text-gray-700">
                                    Ursprunglig fil:
                                    <span className="ml-2 font-medium">{hasSource ? filename : 'Ingen PDF laddad'}</span>
                                </div>
                                <div className="mb-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSending || hasSent}
                                        className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        Lägg till filer
                                    </button>
                                    <span className="text-[11px] text-gray-500">Dra filer hit, klistra in med Ctrl/Cmd+V eller klicka på knappen</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        disabled={isSending || hasSent}
                                        onChange={(event) => {
                                            appendFiles(event.target.files);
                                            event.target.value = '';
                                        }}
                                    />
                                </div>
                                {extraFiles.length === 0 ? (
                                    <div className="text-xs text-gray-500">Inga extra filer valda</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {extraFiles.map((item, index) => (
                                            <li key={`${item.file.name}-${item.file.size}-${index}`} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1 text-xs">
                                                <input
                                                    type="text"
                                                    value={item.displayName}
                                                    onChange={(event) => setExtraFiles((current) => current.map((entry, rowIndex) => (
                                                        rowIndex === index ? { ...entry, displayName: event.target.value } : entry
                                                    )))}
                                                    aria-label={`Filnamn för bilaga ${index + 1}`}
                                                    disabled={isSending || hasSent}
                                                    className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none disabled:bg-gray-100"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setExtraFiles((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                                                    aria-label={`Ta bort bilaga ${item.displayName || index + 1}`}
                                                    disabled={isSending || hasSent}
                                                    className="text-red-700 hover:text-red-900 disabled:opacity-50"
                                                >
                                                    Ta bort
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email-modal-subject" className="mb-1 block text-center text-xs text-gray-700">Ämne</label>
                            <input
                                id="email-modal-subject"
                                className="mb-3 w-full rounded-sm border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none disabled:bg-gray-100"
                                value={subject}
                                onChange={(event) => { markEdited('subject'); setSubject(event.target.value); }}
                                placeholder="Ämne"
                                disabled={isSending || hasSent}
                            />
                            <div className="mb-1 block text-center text-xs text-gray-700">Meddelande</div>
                            <RichTextEditor
                                ref={editorRef}
                                value={body}
                                onChange={(html) => { markEdited('body'); setBody(html); }}
                                placeholder="Meddelande"
                                height="min-h-72 max-h-[28rem]"
                                disabled={isSending || hasSent}
                            />
                        </div>
                    </div>
                    <div className="mx-10 mb-3 mt-6 border-t border-transparent pt-4">
                        {isLoadingDefaults && showDefaultsLoading && (
                            <div role="status" className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-700">
                                <span>Hämtar e-postuppgifter...</span>
                                <button type="button" className="underline" onClick={onContinueManually}>Fortsätt manuellt</button>
                            </div>
                        )}
                        {hasSent && (
                            <div role="status" className="mb-3 rounded border border-green-300 bg-green-50 px-4 py-3 text-xs text-green-800">E-postmeddelandet har skickats. Du kan stänga fönstret.</div>
                        )}
                        {initialWarning && (
                            <div role="alert" className="mb-3 whitespace-pre-wrap break-words rounded border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">{initialWarning}</div>
                        )}
                        {isStale && (
                            <div role="alert" className="mb-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">{STALE_WARNING}</div>
                        )}
                        {!hasSource && (
                            <div role="alert" className="mb-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">Ingen PDF är laddad. Stäng och öppna PDF:en igen.</div>
                        )}
                        {sendError && (
                            <div role="alert" className="mb-3 whitespace-pre-wrap break-words rounded border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">{sendError}</div>
                        )}
                        <div className="flex flex-wrap items-center justify-end gap-4">
                            {hasNoRecipients && !isLoadingDefaults && (
                                <div className="rounded border border-gray-300 bg-amber-50 px-10 py-1 text-xs text-amber-700">Markera minst en mottagare eller kopiemottagare.</div>
                            )}
                            <button
                                type="button"
                                disabled={isSending}
                                onClick={close}
                                className="bg-orange-400 px-10 py-[5px] text-xs text-white shadow-md/30 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Avbryt
                            </button>
                            <button
                                type="submit"
                                disabled={isSending || hasSent || isLoadingDefaults || hasNoRecipients || !hasSource || isStale}
                                className="bg-lime-700 px-10 py-[5px] text-xs text-white shadow-md/30 hover:bg-lime-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSending ? 'Skickar...' : hasSent ? 'Skickat' : 'Skicka'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}
