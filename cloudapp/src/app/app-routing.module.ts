import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent, MainGuard } from './main/main.component';
import { SchedulerComponent } from './scheduler/scheduler.component';
import { EventFormComponent } from './event-form/event-form.component';
import { ConfigurationComponent, ConfigGuard } from './configuration/configuration.component';
import { NoConfigComponent } from './main/no-config.component';
import { ErrorComponent } from './main/error.component';

const routes: Routes = [
  { path: '', component: MainComponent, canActivate: [MainGuard] },
  { path: 'scheduler', component: SchedulerComponent },
  { path: 'configuration', component: ConfigurationComponent, canDeactivate: [ConfigGuard]  },
  { path: 'event/new', component: EventFormComponent },
  { path: 'event/:id', component: EventFormComponent },
  { path: 'noconfig', component: NoConfigComponent },
  { path: 'error', component: ErrorComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
