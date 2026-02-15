import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ui5-page background-design="Solid">
      <ui5-bar slot="header">
        <ui5-title level="H3">Dashboard - AI2UI</ui5-title>
      </ui5-bar>
      <div class="content">
        <ui5-card>
          <ui5-card-header slot="header" title-text="Dashboard"></ui5-card-header>
          <p>dashboard feature content</p>
        </ui5-card>
      </div>
    </ui5-page>
  `,
  styles: [`.content { padding: 1rem; }`]
})
export class DashboardComponent {}
