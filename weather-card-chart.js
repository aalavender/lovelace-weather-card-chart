const locale = {
  en: {
    tempHi: "Temperature",
    tempLo: "Temperature night",
    precip: "precipitation_probability",
    uPress: "hPa",
    uSpeed: "m/s",
    uPrecip: "%",
    cardinalDirections: [
      'N', 'N-NE', 'NE', 'E-NE', 'E', 'E-SE', 'SE', 'S-SE',
      'S', 'S-SW', 'SW', 'W-SW', 'W', 'W-NW', 'NW', 'N-NW', 'N'
    ]
  },
};

class WeatherCardChart extends Polymer.Element {

  static get template() {
    return Polymer.html`
      <style>
        ha-icon {
          color: var(--paper-item-icon-color);
        }
        .card {
          padding: 0 18px 18px 18px;
        }
        .main {
          display: flex;
          align-items: center;
          font-size: 60px;
          font-weight: 350;
          margin-top: -10px;
        }
        .main ha-icon {
          --iron-icon-height: 74px;
          --iron-icon-width: 74px;
          margin-right: 20px;
        }
        .main div {
          cursor: pointer;
          margin-top: -11px;
        }
        .main sup {
          font-size: 32px;
        }
        .attributes {
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px 0px 10px 0px;
        }
        .attributes div {
          text-align: center;
        }
        .conditions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0px 3px 0px 16px;
        }
        .aqi {
          display: flex;
          align-items: center;
          font-size: 20px;
          color:white;
          margin-left: 10px;
          padding: 5px 5px 5px 5px;
        }
        .aqi_level_0_bg {
          background-color: #40c057;
        }
        .aqi_level_1_bg{
          background-color: #82c91e;
        }
        .aqi_level_2_bg {
          background-color: #f76707;
        }
        .aqi_level_3_bg {
          background-color: #e03131;
        }
        .aqi_level_4_bg {
          background-color: #841c3c;
        }
        .aqi_level_5_bg{
          background-color: #540822;
        }
        .alarm {
          background-color: rgb(21, 123, 255)
        }
      </style>
      <ha-card header="[[title]]">
        <div class="card">
          <div class="main">
            <ha-icon icon="[[getWeatherIcon(weatherObj.state)]]"></ha-icon>
            <template is="dom-if" if="[[tempObj]]">
              <div on-click="_tempAttr">[[roundNumber(tempObj.state)]]<sup>[[getUnit('temperature')]]</sup></div>
            </template>
            <template is="dom-if" if="[[!tempObj]]">
              <div on-click="_weatherAttr">[[roundNumber(weatherObj.attributes.temperature)]]<sup>[[getUnit('temperature')]]</sup></div>
            </template>
            
            <div class="aqi">
              <template is="dom-if" if="[[weatherObj.attributes.aqi]]">
                <div class$ = "aqi [[aqiLevel(weatherObj.attributes.aqi.aqi)]]">[[roundNumber(weatherObj.attributes.aqi.aqi)]]</div>
              </template>
            </div>
            </div>
          </div>
          <div class="attributes" on-click="_weatherAttr">
            <div>
              <ha-icon icon="hass:water-percent"></ha-icon> [[roundNumber(weatherObj.attributes.humidity)]] %<br>
              <ha-icon icon="hass:gauge"></ha-icon> [[roundNumber(weatherObj.attributes.pressure)]] [[ll('uPress')]]
            </div>
            <div>
              <template is="dom-if" if="[[sunObj]]">
                <ha-icon icon="mdi:weather-sunset-up"></ha-icon> [[computeTime(sunObj.attributes.next_rising)]]<br>
                <ha-icon icon="mdi:weather-sunset-down"></ha-icon> [[computeTime(sunObj.attributes.next_setting)]]
              </template>
            </div>
            <div>
              <ha-icon icon="hass:[[getWindDirIcon(windBearing)]]"></ha-icon> [[getWindDir(windBearing)]]<br>
              <ha-icon icon="hass:weather-windy"></ha-icon> [[getWindLevel(weatherObj.attributes.wind_speed)]]
            </div>
          </div>
          <ha-chart-base data="[[ChartData]]"></ha-chart-base>
          <div class="conditions">
            <template is="dom-repeat" items="[[forecast]]">
              <div>
                <ha-icon icon="[[getWeatherIcon(item.condition)]]"></ha-icon>
              </div>
            </template>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      config: Object,
      sunObj: Object,
      tempObj: Object,
      mode: String,
      weatherObj: {
        type: Object,
        observer: 'dataChanged',
      },
    };
  }

  constructor() {
    super();
    this.mode = 'daily';
    this.weatherIcons = {
      'clear-night': 'hass:weather-night',
      'cloudy': 'hass:weather-cloudy',
      'fog': 'hass:weather-fog',
      'hail': 'hass:weather-hail',
      'lightning': 'hass:weather-lightning',
      'lightning-rainy': 'hass:weather-lightning-rainy',
      'partlycloudy': 'hass:weather-partly-cloudy',
      'pouring': 'hass:weather-pouring',
      'rainy': 'hass:weather-rainy',
      'snowy': 'hass:weather-snowy',
      'snowy-rainy': 'hass:weather-snowy-rainy',
      'sunny': 'hass:weather-sunny',
      'windy': 'hass:weather-windy',
      'windy-variant': 'hass:weather-windy-variant'
    };
    this.cardinalDirectionsIcon = [
      'mdi:arrow-down', 'mdi:arrow-bottom-left', 'mdi:arrow-left',
      'mdi:arrow-top-left', 'mdi:arrow-up', 'mdi:arrow-top-right',
      'mdi:arrow-right', 'mdi:arrow-bottom-right', 'mdi:arrow-down'
    ];
  }

  setConfig(config) {
    this.config = config;
    this.title = config.title;
    this.weatherObj = config.weather;
    this.tempObj = config.temp;
    this.mode = config.mode;
    if (!config.weather) {
      throw new Error('Please define "weather" entity in the card config');
    }
  }

  set hass(hass) {
    this._hass = hass;
    this.lang = this._hass.selectedLanguage || this._hass.language;
    this.weatherObj = this.config.weather in hass.states ? hass.states[this.config.weather] : null;
    this.sunObj = 'sun.sun' in hass.states ? hass.states['sun.sun'] : null;
    this.tempObj = this.config.temp in hass.states ? hass.states[this.config.temp] : null;
    this.forecast = this.weatherObj.attributes.forecast.slice(0,9);
    this.windBearing = this.weatherObj.attributes.wind_bearing;
  }

  dataChanged() {
    this.drawChart();
  }

  roundNumber(number) {
    var rounded = Math.round(number);
    return rounded;
  }

  ll(str) {
    if (locale[this.lang] === undefined)
      return locale.en[str];
    return locale[this.lang][str];
  }

  computeTime(time) {
    const date = new Date(time);
    return date.toLocaleTimeString(this.lang,
      { hour:'2-digit', minute:'2-digit' }
    );
  }

  computeWind(speed) {
    var calcSpeed = Math.round(speed * 1000 / 3600);
    return calcSpeed;
  }

  getCardSize() {
    return 4;
  }

  getUnit(unit) {
    return this._hass.config.unit_system[unit] || '';
  }

  getWeatherIcon(condition) {
    return this.weatherIcons[condition];
  }

  getWindDirIcon(degree) {
    return this.cardinalDirectionsIcon[parseInt((degree + 22.5) / 45.0)];
  }

  getWindDir(deg) {
    if (locale[this.lang] === undefined)
      return locale.en.cardinalDirections[parseInt((deg + 11.25) / 22.5)];
    return locale[this.lang]['cardinalDirections'][parseInt((deg + 11.25) / 22.5)];
  }

  getWindLevel(speed) {
      //speed: km/h
    if(speed < 1)
    {
        return "无风";
    }else if(speed < 6){
        return "软风";
    }else if(speed < 12){
        return "轻风";
    }else if(speed < 20){
        return "微风";
    }else if(speed < 29){
        return "和风";
    }else if(speed < 39){
        return "清风";
    }else if(speed < 50){
        return "强风";
    }else if(speed < 62){
        return "劲风";
    }else if(speed < 75){
        return "大风";
    }else if(speed < 89){
        return "烈风";
    }else if(speed < 103){
        return "狂风";
    }else if(speed < 117){
        return "暴风";
    }else if(speed < 150){
        return "台风";
    }else if(speed < 184){
        return "强台风";
    }else if(speed < 250){
        return "超强台风";
    }else{
        return "超级台风";
    }
  }

  aqiLevel(aqi) {
    return 'aqi_level_'+parseInt(aqi / 50.0)+'_bg';
  }

  drawChart() {
    var data = this.weatherObj.attributes.forecast.slice(0,9);
    var locale = this._hass.selectedLanguage || this._hass.language;
    var tempUnit = this._hass.config.unit_system.temperature;
    var lengthUnit = this._hass.config.unit_system.length;
    var precipUnit = lengthUnit === 'km' ? this.ll('uPrecip') : 'in';
    var mode = this.mode;
    var i;
    if (!this.weatherObj.attributes.forecast) {
      return [];
    }
    var dateTime = [];
    var tempHigh = [];
    var tempLow = [];
    var precip = [];
    for (i = 0; i < data.length; i++) {
      var d = data[i];
      dateTime.push(new Date(d.datetime));
      tempHigh.push(d.temperature);
      tempLow.push(d.templow);
      precip.push(d.precipitation_probability);
    }
    var style = getComputedStyle(document.body);
    var textColor = style.getPropertyValue('--primary-text-color');
    var dividerColor = style.getPropertyValue('--divider-color');
    const chartOptions = {
      type: 'bar',
      data: {
        labels: dateTime,
        datasets: [
          {
            label: this.ll('tempHi'),
            type: 'line',
            data: tempHigh,
            yAxisID: 'TempAxis',
            borderWidth: 2.0,
            lineTension: 0.4,
            pointRadius: 0.0,
            pointHitRadius: 5.0,
            fill: false,
          },
          {
            label: this.ll('tempLo'),
            type: 'line',
            data: tempLow,
            yAxisID: 'TempAxis',
            borderWidth: 2.0,
            lineTension: 0.4,
            pointRadius: 0.0,
            pointHitRadius: 5.0,
            fill: false,
          },
          {
            label: this.ll('precip'),
            type: 'bar',
            data: precip,
            yAxisID: 'PrecipAxis',
          },
        ]
      },
      options: {
        animation: {
          duration: 300,
          easing: 'linear',
          onComplete: function () {
            var chartInstance = this.chart,
              ctx = chartInstance.ctx;
            ctx.fillStyle = textColor;
            var fontSize = 10;
            var fontStyle = 'normal';
            var fontFamily = 'Roboto';
            ctx.font = Chart.helpers.fontString(fontSize, fontStyle, fontFamily);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            var meta = chartInstance.controller.getDatasetMeta(2);
            meta.data.forEach(function (bar, index) {
              var data = (Math.round((chartInstance.data.datasets[2].data[index]) * 10) / 10).toFixed(1);
              ctx.fillText(data, bar._model.x, bar._model.y - 5);
            });
          },
        },
        legend: {
          display: false,
        },
        scales: {
          xAxes: [{
            type: 'time',
            maxBarThickness: 15,
            display: false,
            ticks: {
              display: false,
            },
            gridLines: {
              display: false,
            },
          },
          {
            id: 'DateAxis',
            position: 'top',
            gridLines: {
              display: true,
              drawBorder: false,
              color: dividerColor,
            },
            ticks: {
              display: true,
              source: 'labels',
              autoSkip: true,
              fontColor: textColor,
              maxRotation: 0,
              callback: function(value, index, values) {
                var data = new Date(value).toLocaleDateString(locale,
                  { weekday: 'short' });
                var time = new Date(value).toLocaleTimeString(locale,
                  { hour: 'numeric' });
                if (mode == 'hourly') {
                  return time;
                }
                return data;
              },
            },
          }],
          yAxes: [{
            id: 'TempAxis',
            position: 'left',
            gridLines: {
              display: true,
              drawBorder: false,
              color: dividerColor,
              borderDash: [1,3],
            },
            ticks: {
              display: true,
              fontColor: textColor,
            },
            afterFit: function(scaleInstance) {
              scaleInstance.width = 28;
            },
          },
          {
            id: 'PrecipAxis',
            position: 'right',
            gridLines: {
              display: false,
              drawBorder: false,
              color: dividerColor,
            },
            ticks: {
              display: false,
              min: 0,
              suggestedMax: 20,
              fontColor: textColor,
            },
            afterFit: function(scaleInstance) {
              scaleInstance.width = 15;
            },
          }],
        },
        tooltips: {
          mode: 'index',
          callbacks: {
            title: function (items, data) {
              const item = items[0];
              const date = data.labels[item.index];
              return new Date(date).toLocaleDateString(locale, {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: 'numeric',
                minute: 'numeric',
              });
            },
            label: function(tooltipItems, data) {
              var label = data.datasets[tooltipItems.datasetIndex].label || '';
              if (data.datasets[2].label == label) {
                return label + ': ' + (tooltipItems.yLabel ?
                  (tooltipItems.yLabel + ' ' + precipUnit) : ('0 ' + precipUnit));
              }
              return label + ': ' + tooltipItems.yLabel + ' ' + tempUnit;
            },
          },
        },
      },
    };
    this.ChartData = chartOptions;
  }

  _fire(type, detail, options) {
    const node = this.shadowRoot;
    options = options || {};
    detail = (detail === null || detail === undefined) ? {} : detail;
    const e = new Event(type, {
      bubbles: options.bubbles === undefined ? true : options.bubbles,
      cancelable: Boolean(options.cancelable),
      composed: options.composed === undefined ? true : options.composed
    });
    e.detail = detail;
    node.dispatchEvent(e);
    return e;
  }

  _tempAttr() {
    this._fire('hass-more-info', { entityId: this.config.temp });
  }

  _weatherAttr() {
    this._fire('hass-more-info', { entityId: this.config.weather });
  }
}

customElements.define('weather-card-chart', WeatherCardChart);
