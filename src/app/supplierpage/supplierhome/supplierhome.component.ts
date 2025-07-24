import { Component } from '@angular/core';
import { SupplierSidebarComponent } from "../supplier-sidebar/supplier-sidebar.component";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-supplierhome',
  imports: [SupplierSidebarComponent,RouterOutlet],
  templateUrl: './supplierhome.component.html',
  styleUrl: './supplierhome.component.css'
})
export class SupplierhomeComponent {
  
}
