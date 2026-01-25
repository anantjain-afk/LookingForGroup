import React from 'react';
import { OctagonAlert } from 'lucide-react'; // Example icon

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, description, confirmText = "Confirm", cancelText = "Cancel" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl max-w-sm w-full p-6 space-y-4 scale-100 animate-in zoom-in-95 duration-200">
                
                <div className="flex items-center gap-3 text-red-400">
                     <div className="bg-red-500/10 p-2 rounded-full">
                        <OctagonAlert size={24} />
                     </div>
                     <h3 className="text-lg font-bold text-gray-100">{title}</h3>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed">
                    {description}
                </p>

                <div className="flex justify-end gap-3 pt-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-[#3f4147] transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-4 py-2 rounded text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
