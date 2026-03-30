import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { MenuComponent } from './components/menu-component/menu-component';
@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, Header, MenuComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('menu');
}
