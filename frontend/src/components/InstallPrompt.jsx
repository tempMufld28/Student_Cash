import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg"
             style={{ background: 'var(--finance-card)', border: '1px solid var(--finance-border)' }}>
            <Download size={18} style={{ color: 'var(--finance-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--finance-text)' }}>
                Instalar Student-Cash
            </span>
            <button
                onClick={install}
                className="rounded-lg px-3 py-1 text-sm font-medium text-white"
                style={{ background: 'var(--finance-primary)' }}
            >
                Instalar
            </button>
            <button onClick={() => setVisible(false)}>
                <X size={16} style={{ color: 'var(--finance-text-muted)' }} />
            </button>
        </div>
    );
}
