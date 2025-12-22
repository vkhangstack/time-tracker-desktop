import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoadingProps {
    className?: string;
    size?: number;
    text?: string;
    fullScreen?: boolean;
}

export function Loading({ className, size = 32, text, fullScreen = true }: LoadingProps) {
    const containerClasses = cn(
        'flex flex-col items-center justify-center bg-background',
        fullScreen ? 'min-h-screen w-full fixed inset-0 z-50' : 'w-full h-full p-4',
        className
    );

    return (
        <div className={containerClasses}>
            <Loader2 className="animate-spin text-primary" size={size} />
            {text && (
                <p className="mt-4 text-muted-foreground text-sm font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}
