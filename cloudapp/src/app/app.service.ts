
import { Injectable } from '@angular/core';
import { InitService, CloudAppConfigService, InitData } from '@exlibris/exl-cloudapp-angular-lib';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Configuration } from './models/configuration';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  private _config: Configuration;

  constructor(
    private configService: CloudAppConfigService
  ) {  }

  get config(): Observable<Configuration> {
    if (this._config) {
      //console.log('cached config');
      return of(this._config);
    }
    return this.configService.get().pipe(
      map(results => 
        Object.keys(results).length == 0 
        ? new Configuration()
        : results
      ),
      tap(config => this._config = config)
    )
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