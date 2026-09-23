import { Application, ApplicationEvent, Clarification } from '@/types';

const APPS_STORAGE_KEY = 'rti_clerk_applications_cache';
const EVENTS_STORAGE_KEY = 'rti_clerk_events_cache';
const CLARS_STORAGE_KEY = 'rti_clerk_clarifications_cache';

class SharedStore {
  public getApplications(): Application[] {
    try {
      const data = localStorage.getItem(APPS_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      // ignore
    }
    return [];
  }

  public saveApplications(apps: Application[]): void {
    try {
      localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
    } catch (e) {
      // ignore
    }
  }

  public upsertApplication(app: Application): void {
    const list = this.getApplications();
    const idx = list.findIndex((a) => a.id === app.id || a.applicationId === app.applicationId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...app };
    } else {
      list.push(app);
    }
    this.saveApplications(list);
  }

  public getApplication(id: string): Application | null {
    const list = this.getApplications();
    return list.find((a) => a.id === id || a.applicationId === id) || null;
  }

  public getEvents(appId: string): ApplicationEvent[] {
    try {
      const data = localStorage.getItem(`${EVENTS_STORAGE_KEY}_${appId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      // ignore
    }
    return [];
  }

  public addEvent(appId: string, event: ApplicationEvent): void {
    const evts = this.getEvents(appId);
    evts.push(event);
    try {
      localStorage.setItem(`${EVENTS_STORAGE_KEY}_${appId}`, JSON.stringify(evts));
    } catch (e) {
      // ignore
    }
  }

  public getClarifications(appId: string): Clarification[] {
    try {
      const data = localStorage.getItem(`${CLARS_STORAGE_KEY}_${appId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      // ignore
    }
    return [];
  }

  public addClarification(appId: string, clar: Clarification): void {
    const list = this.getClarifications(appId);
    list.unshift(clar);
    try {
      localStorage.setItem(`${CLARS_STORAGE_KEY}_${appId}`, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  }
}

export const sharedStore = new SharedStore();
