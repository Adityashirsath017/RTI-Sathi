import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, MessageSquare, Info, X } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Notification } from '@/types';
import { Link } from 'react-router-dom';

interface NotificationDropdownProps {
  clerkUid: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ clerkUid }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!clerkUid) return;
    // Listen to notifications directed to this authenticated officer
    let q;
    try {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', clerkUid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    } catch (e) {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', clerkUid),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let list = snapshot.docs.map((d) => ({
          notificationId: d.id,
          ...d.data(),
        })) as Notification[];
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      },
      (err) => {
        // Fallback without orderBy if composite index is pending
        const simpleQ = query(
          collection(db, 'notifications'),
          where('userId', '==', clerkUid),
          limit(20)
        );
        onSnapshot(simpleQ, (snap) => {
          let list = snap.docs.map((d) => ({
            notificationId: d.id,
            ...d.data(),
          })) as Notification[];
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setNotifications(list);
          setUnreadCount(list.filter((n) => !n.read).length);
        });
      }
    );

    return () => unsubscribe();
  }, [clerkUid]);

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (e) {
      console.error('Could not mark notification as read:', e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CLARIFICATION_REQUIRED':
      case 'CLARIFICATION_REQUESTED':
        return <MessageSquare className="w-4 h-4 text-orange-600" />;
      case 'DEPARTMENT_OVERRIDDEN':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'APPLICATION_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-700" />
                <span className="text-sm font-semibold text-slate-800">
                  Officer Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No notifications recorded yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.notificationId}
                    className={`p-3 text-xs transition-colors hover:bg-slate-50 flex gap-2.5 ${
                      !n.read ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => markAsRead(n.notificationId)}
                  >
                    <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {n.title}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      {n.applicationId && (
                        <Link
                          to={`/review/${n.applicationId}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-block mt-1 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          View {n.applicationId} →
                        </Link>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
