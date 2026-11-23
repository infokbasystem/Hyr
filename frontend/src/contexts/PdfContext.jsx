import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const PdfContext = createContext(null);

export const PdfProvider = ({ children, initialBadges = [] }) => {
    const [showPdfPanel, setShowPdfPanel] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfFilename, setPdfFilename] = useState('');
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [badges, setBadges] = useState(initialBadges);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailResult, setEmailResult] = useState(null);
    const [isStale, setIsStale] = useState(false);
    const currentUrlRef = useRef('');
    const activeRequestRef = useRef(null);
    const requestIdRef = useRef(0);
    const editVersionRef = useRef(0);

    const releasePdf = useCallback(() => {
        if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current);
            currentUrlRef.current = '';
        }
    }, []);

    const beginPdfPreview = useCallback((document) => {
        const request = {
            id: ++requestIdRef.current,
            editVersion: editVersionRef.current,
        };
        activeRequestRef.current = request;
        releasePdf();
        setPdfUrl('');
        setPdfFilename('');
        setPdfDocument(document);
        setPdfError('');
        setPdfLoading(true);
        setShowEmailModal(false);
        setIsStale(false);
        setShowPdfPanel(true);
        return request.id;
    }, [releasePdf]);

    const finishPdfPreview = useCallback((requestId, blob, filename) => {
        const request = activeRequestRef.current;
        if (!request || request.id !== requestId) return false;

        const url = URL.createObjectURL(blob);
        releasePdf();
        currentUrlRef.current = url;
        setPdfUrl(url);
        setPdfFilename(filename);
        setPdfLoading(false);
        setIsStale(request.editVersion !== editVersionRef.current);
        return true;
    }, [releasePdf]);

    const failPdfPreview = useCallback((requestId) => {
        if (activeRequestRef.current?.id !== requestId) return;
        setPdfLoading(false);
        setPdfError('Kunde inte ladda PDF. Försök igen.');
    }, []);

    const closePdfPreview = useCallback(() => {
        activeRequestRef.current = null;
        releasePdf();
        setShowPdfPanel(false);
        setShowEmailModal(false);
        setPdfUrl('');
        setPdfDocument(null);
        setPdfLoading(false);
        setPdfError('');
    }, [releasePdf]);

    useEffect(() => () => {
        activeRequestRef.current = null;
        releasePdf();
    }, [releasePdf]);

    const markStale = useCallback(() => {
        editVersionRef.current += 1;
        setIsStale(true);
    }, []);

    const reportEmailSent = useCallback((document, result) => {
        setEmailResult({ document, result });
    }, []);

    const consumeEmailResult = useCallback((handledResult) => {
        setEmailResult(current => current === handledResult ? null : current);
    }, []);

    const value = {
        showPdfPanel,
        pdfUrl,
        pdfFilename,
        pdfDocument,
        pdfLoading,
        pdfError,
        badges,
        showEmailModal,
        emailResult,
        isStale,
        beginPdfPreview,
        finishPdfPreview,
        failPdfPreview,
        closePdfPreview,
        openEmailModal: () => setShowEmailModal(true),
        closeEmailModal: () => setShowEmailModal(false),
        reportEmailSent,
        consumeEmailResult,
        markStale,
        setBadges,
    };

    return (
        <PdfContext.Provider value={value}>
            {children}
        </PdfContext.Provider>
    );
};

export const usePdf = () => {
    const ctx = useContext(PdfContext);
    if (!ctx) throw new Error('usePdf must be used within PdfProvider');
    return ctx;
};
