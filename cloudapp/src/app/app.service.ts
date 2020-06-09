
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  constructor() {  }

  /*
  async load() {
    console.log('in load- before');
    this._config = await this.configService.get().toPromise();
    console.log('in load- after');
  }

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
  */
}