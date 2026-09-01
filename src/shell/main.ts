import './styles.css';
import { App } from './app.js';

const root = document.querySelector<HTMLDivElement>('#app');
if (root !== null) new App(root).start();
