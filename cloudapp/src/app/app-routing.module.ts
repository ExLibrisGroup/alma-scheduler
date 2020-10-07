import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import { SchedulerComponent } from './scheduler/scheduler.component';
import { EventFormComponent } from './event-form/event-form.component';
import { ConfigurationComponent, ConfigGuard } from './configuration/configuration.component';
import { NoConfigComponent } from './splash/no-config.component';
import { ErrorComponent } from './splash/error.component';
import { SplashComponent } from './splash/splash.component';

const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'main', component: MainComponent },
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
