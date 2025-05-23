'use client';

import { usePathname } from 'next/navigation';
import Taskbar from './Taskbar';

export default function ConditionalTaskbar() {
    const pathname = usePathname();

    if (pathname === '/login' || pathname === '/signup') {
        return null;
    }
    return <Taskbar />;
}