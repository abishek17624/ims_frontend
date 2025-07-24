import { Component,Input } from '@angular/core';

@Component({
  selector: 'app-summary-card',
  imports: [],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.css'
})
export class SummaryCardComponent {
  @Input() title: string = '';
  @Input() value: string = '';
  @Input() subtext: string = '';
  @Input() icon: string = '';
  @Input() iconColor: string = 'blue';
  @Input() trend: string = '';
  @Input() trendColor: string = 'green';
  @Input() comparison: string = '';
  @Input() progress: number = 0;
}
