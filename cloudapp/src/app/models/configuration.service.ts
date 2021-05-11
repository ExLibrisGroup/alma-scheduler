import { Injectable } from '@angular/core';
import { Configuration } from './configuration';
import { CloudAppConfigService, InitData, CloudAppEventsService, CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib'
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ConfigurationService {
  private _config: Configuration;
  private _initData: InitData;
  private _token: string;

  constructor( 
    private configService: CloudAppConfigService,
    private eventsService: CloudAppEventsService,
  ) { }
  
  async getConfig() {
    if (!this._config) {
      let config =  await this.configService.get().toPromise()
      this._config = Object.keys(config).length == 0 
        ? new Configuration()
        : config;
    }
    return this._config;
  }

  async getInitData() {
    if (!this._initData) {
      this._initData = await this.eventsService.getInitData().toPromise();
    }
    return this._initData;
  }

  async getToken() {
    if (!this._token) {
      try {
        this._token = await this.eventsService.getAuthToken().toPromise();
      } catch {
        this._token = '';
      }
    }
    return this._token;
  }

  setConfig(val: Configuration): Observable<boolean> {
    this._config = val;
    return this.configService.set(val).pipe(
      map(()=>true)
    );
  }

  removeConfig(): Observable<boolean> {
    this._config = null;
    return this.configService.remove().pipe(
      map(()=>true)
    );
  }

}
