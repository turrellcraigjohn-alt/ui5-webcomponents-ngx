import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'books',
    loadComponent: () => import('./features/books/books.component').then(m => m.BooksComponent)
  },
  {
    path: 'reader',
    loadComponent: () => import('./features/reader/reader.component').then(m => m.ReaderComponent)
  },
  {
    path: 'reader/:bookId/:pagePath',
    loadComponent: () => import('./features/reader/reader.component').then(m => m.ReaderComponent)
  },
  {
    path: 'glossary',
    loadComponent: () => import('./features/glossary/glossary.component').then(m => m.GlossaryComponent)
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];