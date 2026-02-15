import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  },
  {
    path: 'deployments',
    loadComponent: () => import('./features/deployments/deployments.component')
      .then(m => m.DeploymentsComponent)
  },
  {
    path: 'executions',
    loadComponent: () => import('./features/executions/executions.component')
      .then(m => m.ExecutionsComponent)
  },
  {
    path: 'scenarios',
    loadComponent: () => import('./features/scenarios/scenarios.component')
      .then(m => m.ScenariosComponent)
  },
  {
    path: 'grounding',
    loadComponent: () => import('./features/grounding/grounding.component')
      .then(m => m.GroundingComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component')
      .then(m => m.SettingsComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];