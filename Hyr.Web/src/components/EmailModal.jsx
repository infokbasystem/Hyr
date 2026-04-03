import React from 'react';
import { createPortal } from 'react-dom';

export default function EmailModal({ subject, body, onSubjectChange, onBodyChange, onSend, onClose }) {
    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-md shadow-lg p-4 w-[90%] max-w-md">
                <div className="text-sm font-semibold mb-3">Skicka PDF via e-post</div>
                <label className="block text-xs mb-1">Ämne</label>
                <input
                    className="w-full border rounded px-2 py-1 text-sm mb-3"
                    value={subject}
                    onChange={(e) => onSubjectChange(e.target.value)}
                    placeholder="Ämne"
                />
                <label className="block text-xs mb-1">Meddelande</label>
                <textarea
                    className="w-full border rounded px-2 py-1 text-sm mb-3"
                    rows={4}
                    value={body}
                    onChange={(e) => onBodyChange(e.target.value)}
                    placeholder="Meddelande"
                />
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                    >
                        Avbryt
                    </button>
                    <button
                        type="button"
                        onClick={onSend}
                        className="text-xs px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                    >
                        Skicka
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
