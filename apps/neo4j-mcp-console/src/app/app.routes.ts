import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'schema',
    loadComponent: () => 
      import('./features/schema-explorer/schema-explorer.component').then(m => m.SchemaExplorerComponent)
  },
  {
    path: 'cypher',
    loadComponent: () => 
      import('./features/cypher-editor/cypher-editor.component').then(m => m.CypherEditorComponent)
  },
  {
    path: 'gds',
    loadComponent: () => 
      import('./features/gds-explorer/gds-explorer.component').then(m => m.GdsExplorerComponent)
  },
  {
    path: 'settings',
    loadComponent: () => 
      import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];