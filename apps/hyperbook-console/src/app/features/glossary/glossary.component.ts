import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HyperbookService } from '../../core/services/hyperbook.service';
import { Glossary } from '../../core/models/hyperbook.model';

import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/List.js';
import '@ui5/webcomponents/dist/StandardListItem.js';
import '@ui5/webcomponents/dist/Input.js';

@Component({
  selector: 'app-glossary',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="glossary-container">
      <ui5-title level="H2">Glossary</ui5-title>
      <ui5-input placeholder="Filter terms..." (input)="onFilter($event)" class="filter-input"></ui5-input>
      <ui5-list *ngIf="filteredTerms.length > 0">
        <ui5-li *ngFor="let term of filteredTerms" icon="hint" [attr.description]="term.href">{{ term.name }}</ui5-li>
      </ui5-list>
      <p *ngIf="filteredTerms.length === 0" class="no-terms">No glossary terms available. Load a book with defined terms.</p>
    </div>
  `,
  styles: [`
    .glossary-container { padding: 1rem; }
    .filter-input { width: 100%; max-width: 400px; margin: 1rem 0; }
    .no-terms { color: var(--sapContent_LabelColor); padding: 1rem; }
  `]
})
export class GlossaryComponent implements OnInit {
  glossary: Glossary = {};
  allTerms: { name: string; href: string }[] = [];
  filteredTerms: { name: string; href: string }[] = [];
  constructor(private hyperbookService: HyperbookService) {}
  ngOnInit(): void {
    this.hyperbookService.glossary$.subscribe(glossary => {
      this.glossary = glossary;
      this.allTerms = [];
      Object.entries(glossary).forEach(([_, terms]) => this.allTerms.push(...terms));
      this.filteredTerms = [...this.allTerms];
    });
  }
  onFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredTerms = value ? this.allTerms.filter(t => t.name.toLowerCase().includes(value)) : [...this.allTerms];
  }
}