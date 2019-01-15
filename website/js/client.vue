<template lang='pug'>
  div(id="qna-client")
    v-toolbar(color="#494949" v-if="$store.state.username")
      v-toolbar-title {{title}}
      v-spacer
      v-toolbar-items
        v-btn(flat :href="$store.state.Login" 
          v-if="$store.state.Login && $store.state.username") LogOut
    lex-web-ui
</template>

<script>
/*
Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/

require("babel-polyfill");
var Vuex=require('vuex')

module.exports={
  data:()=>{return {}},
  components:{},
  computed:{
    title:function(){
      return "Sherman"
    }
  },
  methods:{}
}
</script>

<style lang='scss'>
  #lex-web > nav {
    display:none;
  }
  nav {
    z-index:1;
  }
	.message-list[data-v-6f155304]{
		background: #F1F0F0;
	}
  //Bot message bubble
  .message-bot .message-bubble[data-v-46cd8705] {
    background-color: #ffffff !important;
		    border-radius: 5px;
    border: 1px solid #ccc;
    box-shadow: none;
  }
  //Human message bubble
  .message-human .message-bubble[data-v-46cd8705]{
    background-color: #1976d2;
    border-radius: 6px;
  }
  //Message text
  .message-text {
    color: #494949 !important;
		font-size: 16px;
    line-height: 1.3;
  }
  //response card buttons
  .btn__content {
    flex: unset;
    word-break: break-word;
    white-space: normal;
  }
  .btn {
    height: 75px;
  }
  //top portion of response cards
  .card__title.red.lighten-5 {
    background-color: #223b64!important;
    border-color: #223b64!important;
    color: white;
  }
  //top tool bar
  nav.toolbar.toolbar--dense.toolbar--fixed.theme--dark.grey {
    background-color: #494949!important;
  }
  //links
  a:link, a:visited {
    color: blue;
  }
</style>
