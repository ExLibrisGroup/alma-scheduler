import { Component } from "@angular/core";
import { CloudAppEventsService } from "@exlibris/exl-cloudapp-angular-lib";

@Component({
  template: `<p>This app must be configured by an administrator before it can be used.</p>
    <button mat-stroked-button type="button" color="primary" [routerLink]="['/configuration']" *ngIf="isAdmin">Configure</button>
  `
})
export class NoConfigComponent  {
  error: string;
  isAdmin: boolean

  constructor(
    private eventsService: CloudAppEventsService,
  ) {}

  ngOnInit() {
    this.eventsService.getInitData().subscribe( initData => this.isAdmin = initData.user.isAdmin);
  }
}
