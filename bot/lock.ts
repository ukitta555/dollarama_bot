export class Lock {
    private _locked: boolean;
    constructor() {
        this._locked = false;
    }
    get locked() {
        return this._locked;
    }

    set locked(state: boolean) {
        this._locked = state;
    }
}