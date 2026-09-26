/**
 * UIManager: Класс для управления пользовательским интерфейсом (кнопки, переключатели, слайдеры).
 */
export class UIManager {
    constructor(sceneManager, modelLoader) {
        this.sceneManager = sceneManager;
        this.modelLoader = modelLoader;

        this.startArBtn = document.getElementById('startArBtn');
        this.decorSelect = document.getElementById('decorSelect');
        this.materialBtns = document.querySelectorAll('.mat-btn');
        this.rotLeftBtn = document.getElementById('rotLeftBtn');
        this.rotRightBtn = document.getElementById('rotRightBtn');
        this.autoRotBtn = document.getElementById('autoRotBtn');
        this.scaleSlider = document.getElementById('scaleSlider');
        this.scaleVal = document.getElementById('scaleVal');

        this.bindEvents();
    }

    bindEvents() {
        // 1. Кнопка запуска AR
        if (this.startArBtn) {
            this.startArBtn.addEventListener('click', () => {
                this.sceneManager.startAR();
            });
        }

        // 2. Выбор PBR-материала столешницы
        this.materialBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const matKey = e.currentTarget.getAttribute('data-mat');
                this.modelLoader.setTableMaterial(matKey);

                // Визуальное выделение активной кнопки
                this.materialBtns.forEach((b) => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // 3. Выбор декора на столике (ваза, блюдо glTF, свечи)
        if (this.decorSelect) {
            this.decorSelect.addEventListener('change', (e) => {
                this.modelLoader.setDecor(e.target.value);
            });
        }

        // 4. Поворот столика влево / вправо
        if (this.rotLeftBtn) {
            this.rotLeftBtn.addEventListener('click', () => {
                this.modelLoader.rotateTable(-Math.PI / 8);
            });
        }
        if (this.rotRightBtn) {
            this.rotRightBtn.addEventListener('click', () => {
                this.modelLoader.rotateTable(Math.PI / 8);
            });
        }

        // 5. Включение/выключение авто-вращения
        if (this.autoRotBtn) {
            this.autoRotBtn.addEventListener('click', () => {
                this.modelLoader.isAutoRotating = !this.modelLoader.isAutoRotating;
                this.autoRotBtn.classList.toggle('active', this.modelLoader.isAutoRotating);
                this.autoRotBtn.textContent = this.modelLoader.isAutoRotating ? '⏸ Стоп' : '⟳ Авто';
            });
        }

        // 6. Масштабирование через слайдер
        if (this.scaleSlider) {
            this.scaleSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.modelLoader.scaleTable(val);
                if (this.scaleVal) {
                    this.scaleVal.textContent = `${Math.round(val * 100)}%`;
                }
            });
        }
    }
}
