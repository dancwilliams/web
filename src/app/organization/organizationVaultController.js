﻿angular
    .module('bit.organization')

    .controller('organizationVaultController', function ($scope, apiService, cipherService, $analytics, $q, $state,
        $localStorage, $uibModal, $filter) {
        $scope.logins = [];
        $scope.subvaults = [];
        $scope.loading = true;

        $scope.$on('$viewContentLoaded', function () {
            var subvaultPromise = apiService.subvaults.listOrganization({ orgId: $state.params.orgId }, function (subvaults) {
                var decSubvaults = [{
                    id: null,
                    name: 'Unassigned',
                    collapsed: $localStorage.collapsedOrgSubvaults && 'unassigned' in $localStorage.collapsedOrgSubvaults
                }];

                for (var i = 0; i < subvaults.Data.length; i++) {
                    var decSubvault = cipherService.decryptSubvault(subvaults.Data[i], null, true);
                    decSubvault.collapsed = $localStorage.collapsedOrgSubvaults &&
                        decSubvault.id in $localStorage.collapsedOrgSubvaults;
                    decSubvaults.push(decSubvault);
                }

                $scope.subvaults = decSubvaults;
            }).$promise;

            var cipherPromise = apiService.ciphers.listOrganizationDetails({ organizationId: $state.params.orgId },
                function (ciphers) {
                    var decLogins = [];

                    for (var i = 0; i < ciphers.Data.length; i++) {
                        if (ciphers.Data[i].Type === 1) {
                            var decLogin = cipherService.decryptLoginPreview(ciphers.Data[i]);
                            decLogins.push(decLogin);
                        }
                    }

                    $scope.logins = decLogins;
                }).$promise;

            $q.all([subvaultPromise, cipherPromise]).then(function () {
                $scope.loading = false;
            });
        });

        $scope.filterBySubvault = function (subvault) {
            return function (cipher) {
                if (!cipher.subvaultIds || !cipher.subvaultIds.length) {
                    return subvault.id === null;
                }

                return cipher.subvaultIds.indexOf(subvault.id) > -1;
            };
        };

        $scope.subvaultSort = function (item) {
            if (!item.id) {
                return '';
            }

            return item.name.toLowerCase();
        };

        $scope.collapseExpand = function (subvault) {
            if (!$localStorage.collapsedOrgSubvaults) {
                $localStorage.collapsedOrgSubvaults = {};
            }

            var id = subvault.id || 'unassigned';

            if (id in $localStorage.collapsedOrgSubvaults) {
                delete $localStorage.collapsedOrgSubvaults[id];
            }
            else {
                $localStorage.collapsedOrgSubvaults[id] = true;
            }
        };

        $scope.editSubvaults = function (cipher) {
            var modal = $uibModal.open({
                animation: true,
                templateUrl: 'app/organization/views/organizationVaultLoginSubvaults.html',
                controller: 'organizationVaultLoginSubvaultsController',
                resolve: {
                    cipher: function () { return cipher; },
                    subvaults: function () { return $scope.subvaults; }
                }
            });

            modal.result.then(function (response) {
                if (response.subvaultIds) {
                    cipher.subvaultIds = response.subvaultIds;
                }
            });
        };
    });