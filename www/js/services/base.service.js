(function() {
  'use strict';

  angular
    .module('app.service')
    .factory('BaseService', BaseService);

  ////////////////////////////////////////////////////////////

  /* @ngInject */
  function BaseService($q, $http, $ionicLoading, $ionicPopup,
    $ionicModal, $ionicActionSheet, $timeout, $cordovaInAppBrowser, AuthService, rbchina_api) {

    var modals = [];
    var statusBarStyle = 0;
    var service = {
      // 弹出框
      alert: alert,
      confirm: confirm,
      // 加载动画
      showLoading: showLoading,
      hideLoading: hideLoading,
      // 模态框
      registModal: registModal,
      showModal: showModal,
      hideModal: hideModal,
      recycleModals: recycleModals,
      recycleModalById: recycleModalById,
      reserveModalById: reserveModalById,
      // ActionSheet
      showActionSheet: showActionSheet,
      // 上传图片
      uploadPicture: uploadPicture,
      openUrl: openUrl,
      dismissSafari: dismissSafari,
      statusBar: statusBar,
      formatTopicBody: formatTopicBody
    };

    return service;

    //////////////////////////////////////////////////////////////////////
    // 说明：由于删除 jQuery 的缘故，不再使用 BaseService.formatTopicBody 方法调整链接
    function formatTopicBody() {
      $timeout(function() {
        // 处理外部链接
        var exlinks = $('.ex-link');

        // 先去掉 href 属性，防止触发内部浏览器
        _.forEach(exlinks, function(link) {
          var orig = $(link).attr("href");
          $(link).removeAttr("href");
          $(link).data('url', orig);
          // $(link).attr("ng-click", "vm.openExternLinks('" + orig + "')");
        });

        exlinks.click(function() {
          var url = $(this).data('url');
          openUrl(url);
          return false;
        });

        // 处理@链接
        var atuser_links = $('.at_user');
        _.forEach(atuser_links, function(link) {
          var orig = $(link).attr("href") || '';
          if (orig.indexOf('#/app/user/') == -1) {
            $(link).attr("href", "#/app/user/" + orig.slice(1));
          }
        });

        var atfloor_links = $('.at_floor');
        atfloor_links.on('click', function() {
          return false;
        });
      });
    }

    // 弹出警告框
    function alert(title, subTitle, message) {
      return $ionicPopup.alert({
        title: title,
        subTitle: subTitle,
        template: '<p class="text-center"><b class="assertive">' + message + '</b></p>',
        okText: '知道了'
      });
    }

    // 弹出确认框
    function confirm(title, subTitle, message) {
      return $ionicPopup.confirm({
          title: title,
          subTitle: subTitle,
          template: '<p class="text-center">' + message + '</p>',
          okText: '确认',
          cancelText: '取消'
        })
        .then(function(res) {
          return res;
        });
    }

    // 弹出加载界面
    // 可传入Spinner类型和消息
    function showLoading(style, message) {
      return $ionicLoading.show({
        template: '<ion-spinner icon="' + style +
          '" class="spinner-light"></ion-spinner><p class="text">' +
          message + '</p>',
        duration: 6000 // 为避免卡死，6秒后如无反应则隐藏
      });
    }

    // 结束加载动画
    function hideLoading() {
      $ionicLoading.hide();
    }

    // 注册模态框
    function registModal(template_url, modal_id, scope, opts) {
      var defaults = {
        scope: scope,
        animation: 'slide-in-up'
      };
      var options = _.merge(defaults, opts);
      return $ionicModal.fromTemplateUrl(template_url, options)
        .then(function(modal) {
          if (_.indexOf(_.pluck(modals, "id"), modal_id) === -1) {
            modals.push({
              id: modal_id,
              modal: modal
            });
            return modals;
          }
        });
    }

    // 弹出模态框
    function showModal(modal_id) {
      changeStatusBar(1);
      var modal = _.find(modals, "id", modal_id).modal;
      return modal.show();
    }

    // 隐藏模态框
    function hideModal(modal_id) {
      statusBar(statusBarStyle);
      var modal = _.find(modals, "id", modal_id).modal;
      return modal.hide();
    }

    // 回收所有模态框
    function recycleModals() {
      _.forEach(modals, function(modal) {
        modal.modal.remove();
      });
      modals = [];
    }

    // 回收某个模态框
    function recycleModalById(modal_id) {
      var modal = _.find(modals, "id", modal_id).modal;
      modal.remove();
      modals = _.reject(modals, "id", modal_id);
    }

    // 保留某个模态框
    function reserveModalById(modal_id) {
      var modal = _.find(modals, "id", modal_id).modal;
      _.forEach(modals, function(m) {
        if (modal.id !== m.modal.id) {
          m.modal.remove();
        }
      });
      modals = _.select(modals, "id", modal_id);
    }

    // 弹出 ActionSheet
    function showActionSheet(buttons, titleText, cancelText, buttonsCb, destructiveText, destructiveCb) {
      var options = {
        buttons: buttons,
        titleText: titleText,
        cancelText: cancelText,
        buttonClicked: buttonsCb,
        destructiveText: destructiveText,
        destructiveButtonClicked: destructiveCb
      };
      return $ionicActionSheet.show(options);
    }

    // 上传图片
    function uploadPicture(file) {
      var q = $q.defer();
      var url = rbchina_api.url_prefix + '/photos.json';
      showLoading('lines', '上传中...');
      var data = new FormData();
      var ext = file.split(',')[0].split(':')[1].split(';')[0].split('/')[1];
      data.append("file", dataURItoBlob(file), "photo." + ext); // 调了半天原来是这里Blob要加个name
      $http.post(url, data, {
          params: {
            access_token: AuthService.getAccessToken()
          },
          transformRequest: angular.identity,
          headers: {
            'Content-Type': undefined
          }
        })
        .success(function(result) {
          hideLoading();
          q.resolve(result);
        })
        .error(function(err) {
          hideLoading();
          q.reject(err);
        });
      return q.promise;
    }

    // https://github.com/EddyVerbruggen/cordova-plugin-safariviewcontroller
    function openUrl(url) {
      // console.debug(url);
      url = encodeURI(url);

      SafariViewController.isAvailable(function(available) {
        if (available) {
          SafariViewController.show({
              url: url,
              animated: false, // default true, note that 'hide' will reuse this preference (the 'Done' button will always animate though)
              enterReaderModeIfAvailable: false // default false
            },
            // this success handler will be invoked for the lifecycle events 'opened', 'loaded' and 'closed'
            function(result) {},
            function(msg) {})
        } else {
          // potentially powered by InAppBrowser because that (currently) clobbers window.open
          var options = {
            location: 'yes',
            clearcache: 'yes',
            toolbar: 'yes'
          };
          $cordovaInAppBrowser.open(url, '_blank', options)
            .then(function(event) {
              // success
            })
            .catch(function(event) {
              // error
            });
        }
      })
    }

    function dismissSafari() {
      SafariViewController.hide();
    }

    function statusBar(style) {
      statusBarStyle = style;
      changeStatusBar(style);
    }

    function changeStatusBar(style) {
      if (!window.StatusBar) {
        return;
      }

      if (style == 0) {
        StatusBar.styleLightContent();
      } else {
        StatusBar.styleDefault();
      }
    }
  }

  // base64字符串转图片格式
  function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
      byteString = atob(dataURI.split(',')[1]);
    else
      byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {
      name: 'photo',
      type: mimeString
    });
  }

})();
