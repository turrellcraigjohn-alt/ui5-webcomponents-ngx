import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VersioningService {
  private readonly _version = signal('1.0.0');
  private readonly _apiVersion = signal('2.18.1'); // Matches @ui5/webcomponents version

  readonly version = this._version.asReadonly();
  readonly apiVersion = this._apiVersion.asReadonly();

  constructor() {}

  getSummary() {
    return `UI5-Angular NGX v${this._version()} (UI5 WebComponents v${this._apiVersion()})`;
  }
}
