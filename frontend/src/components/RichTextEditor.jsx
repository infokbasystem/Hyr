import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

const EMPTY_TOOLBAR_STATE = {
    bold: false,
    italic: false,
    underline: false,
    insertUnorderedList: false,
    insertOrderedList: false,
};

const SANITIZER_OPTIONS = {
    ALLOWED_TAGS: ['a', 'b', 'blockquote', 'br', 'div', 'em', 'font', 'i', 'li', 'ol', 'p', 's', 'span', 'strong', 'sub', 'sup', 'u', 'ul'],
    ALLOWED_ATTR: ['href', 'size', 'style'],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
};

function safeFontSize(value) {
    const size = value.toLowerCase().trim();
    if (/^(xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/.test(size)) return size;
    const match = size.match(/^(\d+(?:\.\d+)?)(px|pt|em|rem|%)$/);
    if (!match) return '';
    const amount = Number(match[1]);
    const maximum = match[2] === '%' ? 600 : ['em', 'rem'].includes(match[2]) ? 6 : 96;
    return amount > 0 && amount <= maximum ? size : '';
}

function sanitizeHtml(value) {
    const fragment = DOMPurify.sanitize(typeof value === 'string' ? value : '', SANITIZER_OPTIONS);

    fragment.querySelectorAll('[style]').forEach((element) => {
        const weight = element.style.fontWeight.toLowerCase().trim();
        const style = element.style.fontStyle.toLowerCase().trim();
        const decoration = element.style.textDecorationLine.toLowerCase().trim();
        const size = safeFontSize(element.style.fontSize);

        element.removeAttribute('style');
        if (/^(normal|bold|bolder|lighter|[1-9]00)$/.test(weight)) element.style.fontWeight = weight;
        if (/^(normal|italic|oblique)$/.test(style)) element.style.fontStyle = style;
        if (/^(none|underline|line-through|underline line-through|line-through underline)$/.test(decoration)) {
            element.style.textDecorationLine = decoration;
        }
        if (size) element.style.fontSize = size;
    });

    fragment.querySelectorAll('[size]').forEach((element) => {
        if (element.tagName !== 'FONT' || !/^[1-7]$/.test(element.getAttribute('size'))) {
            element.removeAttribute('size');
        }
    });

    const container = document.createElement('div');
    container.appendChild(fragment);
    return container.innerHTML;
}

function readCommandState(command) {
    try {
        return typeof document.queryCommandState === 'function' && document.queryCommandState(command);
    } catch {
        return false;
    }
}

const RichTextEditor = forwardRef(function RichTextEditor({
    value,
    onChange,
    placeholder = '',
    height = 'min-h-24 max-h-56',
    disabled = false,
}, ref) {
    const editorRef = useRef(null);
    const selectionRef = useRef(null);
    const [toolbarState, setToolbarState] = useState(EMPTY_TOOLBAR_STATE);

    useImperativeHandle(ref, () => ({
        getHtml: () => sanitizeHtml(editorRef.current?.innerHTML || ''),
    }), []);

    useLayoutEffect(() => {
        if (!editorRef.current) return;
        const nextHtml = sanitizeHtml(value);
        if (editorRef.current.innerHTML !== nextHtml) {
            editorRef.current.innerHTML = nextHtml;
            selectionRef.current = null;
        }
    }, [value]);

    const updateSelection = useCallback(() => {
        const selection = window.getSelection();
        const editor = editorRef.current;
        if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
            setToolbarState((current) => Object.values(current).some(Boolean) ? EMPTY_TOOLBAR_STATE : current);
            return;
        }

        selectionRef.current = selection.getRangeAt(0).cloneRange();
        const next = {
            bold: readCommandState('bold'),
            italic: readCommandState('italic'),
            underline: readCommandState('underline'),
            insertUnorderedList: readCommandState('insertUnorderedList'),
            insertOrderedList: readCommandState('insertOrderedList'),
        };
        setToolbarState((current) => (
            Object.keys(next).every((key) => current[key] === next[key]) ? current : next
        ));
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', updateSelection);
        return () => document.removeEventListener('selectionchange', updateSelection);
    }, [updateSelection]);

    const placeCaretAtEnd = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection) return;
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        selectionRef.current = range.cloneRange();
    };

    const restoreSelection = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection) return;
        const range = selectionRef.current;
        if (!range || !editor.contains(range.commonAncestorContainer)) {
            placeCaretAtEnd();
            return;
        }
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const emitContent = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const cleanHtml = sanitizeHtml(editor.innerHTML);
        if (editor.innerHTML !== cleanHtml) {
            editor.innerHTML = cleanHtml;
            placeCaretAtEnd();
        }
        updateSelection();
        onChange?.(cleanHtml);
    };

    const applyCommand = (command, commandValue = null) => {
        if (disabled || !editorRef.current || typeof document.execCommand !== 'function') return;
        editorRef.current.focus();
        restoreSelection();
        document.execCommand(command, false, commandValue);
        emitContent();
    };

    const insertTransfer = (event, transfer) => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        const editor = editorRef.current;
        if (disabled || !editor || !transfer) return;

        const html = transfer.getData('text/html');
        const text = transfer.getData('text/plain');
        const content = html ? sanitizeHtml(html) : text;
        if (!content) return;

        editor.focus();
        restoreSelection();
        let inserted = false;
        if (typeof document.execCommand === 'function') {
            inserted = document.execCommand(html ? 'insertHTML' : 'insertText', false, content);
        }
        if (!inserted) {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const range = selection.getRangeAt(0);
            const insertion = html ? range.createContextualFragment(content) : document.createTextNode(content);
            const lastNode = insertion.lastChild || insertion;
            range.deleteContents();
            range.insertNode(insertion);
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        emitContent();
    };

    const buttonClassName = (active) => (
        `rounded px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'bg-yellow-200 text-gray-900' : 'hover:bg-gray-200'}`
    );

    return (
        <div className="w-full rounded-sm border border-gray-300 bg-white">
            <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 p-1" role="toolbar" aria-label="Textformatering">
                <button type="button" className={buttonClassName(toolbarState.bold)} disabled={disabled} aria-pressed={toolbarState.bold} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('bold')} title="Fet">B</button>
                <button type="button" className={`${buttonClassName(toolbarState.italic)} italic`} disabled={disabled} aria-pressed={toolbarState.italic} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('italic')} title="Kursiv">I</button>
                <button type="button" className={`${buttonClassName(toolbarState.underline)} underline`} disabled={disabled} aria-pressed={toolbarState.underline} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('underline')} title="Understruken">U</button>
                <button type="button" className={buttonClassName(toolbarState.insertUnorderedList)} disabled={disabled} aria-pressed={toolbarState.insertUnorderedList} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('insertUnorderedList')} title="Punktlista">•</button>
                <button type="button" className={buttonClassName(toolbarState.insertOrderedList)} disabled={disabled} aria-pressed={toolbarState.insertOrderedList} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('insertOrderedList')} title="Numrerad lista">1.</button>
                <select
                    className="ml-2 rounded border border-gray-300 px-1 py-[2px] text-xs disabled:opacity-50"
                    defaultValue="3"
                    disabled={disabled}
                    onChange={(event) => applyCommand('fontSize', event.target.value)}
                    aria-label="Textstorlek"
                    title="Textstorlek"
                >
                    <option value="2">Liten</option>
                    <option value="3">Normal</option>
                    <option value="4">Stor</option>
                    <option value="5">X-Stor</option>
                </select>
                <button type="button" className="ml-auto rounded px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-50" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('removeFormat')} title="Rensa formatering">Rensa format</button>
            </div>
            <div
                ref={editorRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                role="textbox"
                aria-label="Meddelande"
                aria-multiline="true"
                aria-disabled={disabled}
                className={`${height} overflow-y-auto whitespace-pre-wrap break-words p-2 text-xs focus:outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:ml-1`}
                onInput={emitContent}
                onMouseUp={updateSelection}
                onKeyUp={updateSelection}
                onFocus={updateSelection}
                onPaste={(event) => insertTransfer(event, event.clipboardData)}
                onDrop={(event) => insertTransfer(event, event.dataTransfer)}
                data-placeholder={placeholder}
            />
        </div>
    );
});

export default RichTextEditor;
