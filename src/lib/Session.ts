import {CancelTokenSession} from './CancelTokenSession';
import {ExtPromiseWrapper} from './ExtPromiseWrapper';
import {State} from './State';

export class Thread {
    /**
     * @internal
     */
    _runPromise: ExtPromiseWrapper<[string, any]> = new ExtPromiseWrapper();
    /**
     * @internal
     */
    _current: State<BaseSession> = null;
    /**
     * Promise session wrapping active state's `onEntry()` promise, as well as being available
     * to wrap internal steps.
     * @internal
     */
    _activePromise: CancelTokenSession = null;
    /**
     * Callback to clean up an internal step if a state is interrupted. If an async step inside
     * an `onEntry()` needs cleaning up, then it should set this property on the Session to a method
     * that will take care of that clean up.
     */
    activeStateCleanup: () => void = null;
    
    wrap<T>(promise: Promise<T>): Promise<T> {
        return this._activePromise.wrap(promise);
    }
}

export interface BaseSession {
    /**
     * @internal
     */
    _threads: Map<number, Thread>;
}

export type Session<S> = S & BaseSession;