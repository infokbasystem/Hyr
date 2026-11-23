import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Mail, Printer, X } from 'lucide-react';
import EmailModal from './EmailModal';
import ActionButton from './ActionButton';
import { AuthContext } from '../AuthContext';
import { usePdf } from '../contexts/PdfContext';
import { getCustomerById } from '../lib/customerApi';
import { getCompanyInfo } from '../lib/officeApi';
import { getMailTextByItem } from '../lib/mailTextApi';
import { buildCopyRecipients, buildMailContent, extractEmailAddresses } from '../lib/mailTemplate';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfEmailComposer({ document, sourceUrl, sourceName, userEmail, isStale, onClose, onSent }) {
    const [defaults, setDefaults] = useState(null);
    const [showDefaultsLoading, setShowDefaultsLoading] = useState(false);
    const initialDataRef = useRef({ document, userEmail });
    const manualEntryRef = useRef(false);
    const [manualDefaults] = useState(() => ({
        ...buildMailContent({ kind: document.kind, number: document.number }),
        receiverList: extractEmailAddresses(document.email).map(email => ({ email, doSend: true })),
        ccMailList: buildCopyRecipients(userEmail),
    }));

    useEffect(() => {
        if (defaults) return undefined;
        const timer = setTimeout(() => setShowDefaultsLoading(true), 500);
        return () => clearTimeout(timer);
    }, [defaults]);

    useEffect(() => {
        let active = true;
        const { document: currentDocument, userEmail: currentUserEmail } = initialDataRef.current;
        const item = currentDocument.kind === 'invoice' ? 'INVOICE' : 'RESERVATION';

        Promise.allSettled([
            currentDocument.customerId ? getCustomerById(currentDocument.customerId) : Promise.resolve(null),
            getCompanyInfo(),
            getMailTextByItem(item),
        ]).then(([customerResult, officeResult, templateResult]) => {
            if (!active || manualEntryRef.current) return;

            const warnings = [];
            if (customerResult.status === 'rejected' || (currentDocument.customerId && !customerResult.value)) {
                warnings.push('Kundens e-postadress kunde inte hämtas');
                if (customerResult.status === 'rejected') console.error('Error loading email customer defaults.');
            }
            if (officeResult.status === 'rejected' || !officeResult.value) {
                warnings.push('Företagsuppgifterna kunde inte hämtas');
                if (officeResult.status === 'rejected') console.error('Error loading email office defaults.');
            }
            if (templateResult.status === 'rejected') {
                warnings.push('E-postmallen kunde inte hämtas');
                console.error('Error loading email template defaults.');
            }

            const customer = customerResult.status === 'fulfilled' ? customerResult.value : null;
            const office = officeResult.status === 'fulfilled' ? officeResult.value : null;
            const template = templateResult.status === 'fulfilled' ? templateResult.value : null;
            const { subject, body } = buildMailContent({
                template,
                kind: currentDocument.kind,
                number: currentDocument.number,
                officeName: office?.name,
            });
            const receiverList = extractEmailAddresses(
                currentDocument.kind === 'reservation' ? currentDocument.email : '',
                customer?.email,
            ).map(email => ({ email, doSend: true }));

            setDefaults({
                subject,
                body,
                receiverList,
                ccMailList: buildCopyRecipients(office?.email, currentUserEmail),
                warning: warnings.length
                    ? `${warnings.join('. ')}. Stäng och öppna e-postfönstret för att försöka igen, eller fyll i uppgifterna manuellt.`
                    : '',
            });
        });

        return () => { active = false; };
    }, []);

    const continueManually = () => {
        manualEntryRef.current = true;
        setDefaults({
            ...manualDefaults,
            warning: 'Alla e-postuppgifter har inte hämtats. Fyll i dem manuellt eller öppna fönstret igen för att försöka på nytt.',
        });
    };
    const currentDefaults = defaults || manualDefaults;

    return (
        <EmailModal
            initialSubject={currentDefaults.subject}
            initialBody={currentDefaults.body}
            receiverList={currentDefaults.receiverList}
            ccMailList={currentDefaults.ccMailList}
            initialWarning={currentDefaults.warning}
            isLoadingDefaults={!defaults}
            showDefaultsLoading={showDefaultsLoading}
            onContinueManually={continueManually}
            sourceAttachmentUrl={sourceUrl}
            sourceAttachmentName={sourceName}
            invoiceId={document.kind === 'invoice' ? document.id : null}
            reservationId={document.kind === 'reservation' ? document.id : null}
            isStale={isStale}
            onClose={onClose}
            onSent={onSent}
        />
    );
}

export default function PdfPanel({ onOpenFileModal = null, topOffset = '0px' }) {
    const {
        showPdfPanel,
        pdfUrl,
        pdfFilename,
        pdfDocument,
        pdfLoading,
        pdfError,
        closePdfPreview,
        badges,
        openEmailModal,
        showEmailModal,
        closeEmailModal,
        reportEmailSent,
        isStale
    } = usePdf();
    const { user } = useContext(AuthContext);
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [loadedUrl, setLoadedUrl] = useState('');
    const [visible, setVisible] = useState(false);
    const [showDoc, setShowDoc] = useState(false);
    const delayRef = useRef(null);
    const currentUrlRef = useRef(pdfUrl);
    currentUrlRef.current = pdfUrl;
    const pdfReady = Boolean(pdfUrl && loadedUrl === pdfUrl && !loading && !error && !pdfLoading);

    const pdfOptions = useMemo(() => ({
        disableRange: true,
        disableStream: true
    }), []);

    const getPageNumbers = () => {
        if (!numPages || typeof numPages !== 'number' || numPages < 1) return [];
        return Array.from({ length: numPages }, (_, i) => i + 1);
    };

    // Keep panel visibility synced
    useEffect(() => {
        if (showPdfPanel) setVisible(true);
    }, [showPdfPanel]);

    // Sync visibility when panel is closed externally
    useEffect(() => {
        if (!showPdfPanel) setVisible(false);
    }, [showPdfPanel]);

    // Reset state on URL change, clear any pending delay
    useEffect(() => {
        setNumPages(null);
        setError(false);
        setShowDoc(false);
        setLoadedUrl('');
        if (pdfUrl) {
            setLoading(true);
            setVisible(true);
        } else {
            setLoading(false);
        }
        if (delayRef.current) {
            clearTimeout(delayRef.current);
            delayRef.current = null;
        }
        return () => {
            if (delayRef.current) {
                clearTimeout(delayRef.current);
                delayRef.current = null;
            }
        };
    }, [pdfUrl]);

    const handleClose = () => {
        setVisible(false);
        closePdfPreview?.();
    };

    const handlePrint = () => {
        if (!pdfUrl) return;
        const win = window.open(pdfUrl, '_blank');
        if (win) {
            win.focus();
            win.onload = () => win.print();
        }
    };

    useEffect(() => {
        if (!showDoc) return;

        const canvases = document.querySelectorAll(
            '.react-pdf__Page canvas'
        );

        canvases.forEach((canvas) => {
            const ctx = canvas.getContext('2d');
            if (!ctx || ctx.__patched) return;

            const originalClear = ctx.clearRect.bind(ctx);
            ctx.clearRect = (...args) => {
                console.log('📉 PDF canvas cleared', args);
                return originalClear(...args);
            };

            ctx.__patched = true;
            console.log('🧠 Patched canvas', canvas);
        });
    }, [showDoc]);

    useEffect(() => {
        if (!showDoc) return;

        const observers = [];

        document
            .querySelectorAll('.react-pdf__Page canvas')
            .forEach((canvas) => {
                const ro = new ResizeObserver(() => {
                    console.log('📐 PDF canvas resized');
                });
                ro.observe(canvas);
                observers.push(ro);
            });

        return () => observers.forEach(o => o.disconnect());
    }, [showDoc]);


    return (
        <>
            <div
                className={`absolute right-0 z-40 w-[560px] bg-yellow-50 shadow-xl/30 px-5 py-10
                    transform transition-transform duration-300
                    ${visible ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'}`}
                style={{ top: topOffset, height: `calc(100vh - ${topOffset} * 2)` }}
            >
                <div className="flex items-center gap-3 p-3">
                    <ActionButton
                        label="Stäng"
                        icon={X}
                        onClick={handleClose}
                        accent="rose"
                    />
                    <ActionButton
                        label="Skriv ut"
                        icon={Printer}
                        onClick={handlePrint}
                        disabled={!pdfReady || isStale}
                        accent="sky"
                    />
                    <ActionButton
                        label="Maila"
                        icon={Mail}
                        onClick={openEmailModal}
                        disabled={!pdfReady || isStale || !pdfDocument}
                        accent="indigo"
                    />
                    {/* <button
                        type="button"
                        onClick={openExampleModal}
                        className="shadow-md/30 text-xs text-gray bg-green-200 hover:bg-green-300 px-4 py-[5px] ml-3 w-20">
                        Info
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowLocalModal(true)}
                        className="shadow-md/30 text-xs text-gray bg-purple-200 hover:bg-purple-300 px-4 py-[5px] ml-3 w-20">
                        Lokal
                    </button> */}

                    {Array.isArray(badges) && badges.length > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            {badges.map((b, i) => (
                                <span
                                    key={i}
                                    className="text-tiny px-2.5 py-1 rounded-full shadow-sm border border-gray-300"
                                    style={{
                                        background: b?.color || '#e5e7eb',
                                        color: b?.color ? '#fff' : '#111'
                                    }}
                                >
                                    {b?.text ?? String(b)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative h-[calc(100%-50px)] overflow-auto px-3 pb-3">
                    {(pdfLoading || loading) && <p className="text-center text-xs text-gray-600">Laddar PDF...</p>}
                    {(pdfError || error) && (
                        <p role="alert" className="text-center text-xs text-rose-700">
                            {pdfError || 'Kunde inte visa PDF. Försök igen.'}
                        </p>
                    )}

                    {pdfUrl && (
                        <Document
                            key={pdfUrl}
                            file={pdfUrl}
                            options={pdfOptions}
                            onLoadSuccess={({ numPages }) => {
                                if (currentUrlRef.current !== pdfUrl) return;
                                setNumPages(numPages);
                                setLoading(false);
                                setLoadedUrl(pdfUrl);
                                // Start 100ms delay after the Document is fully ready
                                if (delayRef.current) clearTimeout(delayRef.current);
                                delayRef.current = setTimeout(() => setShowDoc(true), 10);
                            }}
                            onLoadError={(err) => {
                                if (currentUrlRef.current !== pdfUrl) return;
                                console.error('PDF load error:', err);
                                setLoading(false);
                                setError(true);
                            }}
                            loading={null}
                        >
                            {getPageNumbers().map((pageNumber) => (
                                <div
                                    key={`wrapper_${pageNumber}`}
                                    className="my-3 overflow-hidden border border-gray-200 shadow-sm"
                                    style={{
                                        background: 'transparent',
                                        visibility: showDoc ? 'visible' : 'hidden'
                                    }}
                                >
                                    <Page
                                        key={`page_${pageNumber}`}
                                        pageNumber={pageNumber}
                                        width={500}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                </div>
                            ))}
                        </Document>
                    )}

                    {isStale && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 pointer-events-none">
                            <div className="text-center">
                                <p className="text-xs text-gray-600 font-semibold">PDF är inaktuell</p>
                                <p className="text-xs text-gray-500">Spara för att uppdatera</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showEmailModal && pdfDocument && pdfUrl && (
                <PdfEmailComposer
                    document={pdfDocument}
                    sourceUrl={pdfUrl}
                    sourceName={pdfFilename}
                    userEmail={user?.email}
                    isStale={isStale || !pdfReady}
                    onClose={closeEmailModal}
                    onSent={result => reportEmailSent(pdfDocument, result)}
                />
            )}
        </>
    );
}