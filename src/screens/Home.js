
import React, { Component } from 'react';
import {
  AsyncStorage,
  Platform,
  StyleSheet,
  ScrollView,
  Text,
  Image,
  WebView,
  TouchableOpacity,
  TouchableHighlight,
  NativeModules,
  TouchableWithoutFeedback,
  View
} from 'react-native';


import Row from '../components/Row';
import moment from 'moment';
import config from '../config';
import './userAgent';
import { AuthWebView } from '@livechat/chat.io-customer-auth';
import { init } from '@livechat/chat.io-customer-sdk';



import Bubbles from '../Bubbles';
import { Common } from '../styles';
import LinearGradient from 'react-native-linear-gradient';
import Header from '../components/Header'
import Availability from './Availability';
import NewChat from './NewChat';
import ChatIO from './ChatIOsdk';

import Modal from 'react-native-modal';

import Storage from 'react-native-storage';

let { ACEChatViewController } = NativeModules;

let storage = new Storage({
	// maximum capacity, default 1000 
	size: 1000,

	// Use AsyncStorage for RN, or window.localStorage for web.
	// If not set, data would be lost after reload.
	storageBackend: AsyncStorage,
	
	// expire time, default 1 day(1000 * 3600 * 24 milliseconds).
	// can be null, which means never expire.
	defaultExpires: null,
	
	// cache data in the memory. default is true.
	enableCache: true,
	
	// if data was not found in storage or expired,
	// the corresponding sync method will be invoked and return 
	// the latest data.
	sync : {
		// we'll talk about the details later.
	}
})	
global.storage = storage;
//import Rx from 'rxjs'
// import { bindActionCreators } from 'redux';
// import { connect } from 'react-redux';
// import * as actions from '../actions';
const images = {
  arrowRight: require('../img/arrow-right.png'),
  Plumbing: require('../img/circle/plumbing.png'),  
  "Lawn & Garden": require('../img/circle/lawn.png'),
  Electrical: require('../img/circle/electrical.png'),
  Paint: require('../img/circle/paint.png'),
  "Outdoor Living": require('../img/circle/outdoor.png'),
  Hardware: require('../img/circle/hardware.png'),
  "Heating & Cooling": require('../img/circle/heatingCooling.png'),
  Tools: require('../img/circle/tools.png'),
  "Home Goods": require('../img/circle/indoor.png'),
  Other: require('../img/circle/other.png'),
};

const hideChats = [
  'OZ0H23E5X2'
]

class Home extends Component {
    constructor(props) {
      super(props);
      
      this._fab = false;
      this._rightButton = null;
      this._contextualMenu = false;
      this._toggleTabs = 'shown';
      this._toggleNavBar = 'shown';
      // this.source = { uri: 'https://www.github.com' }
      // this.source2 = { uri: 'https://yahoo.com' }
      this.state = {
        isConnected: false,
        chats: [],
        stores: [],
        activeChats: [],
        previousChats: [],
        customerId: null,
        userData: [],
        chatProps: {},
        loadingText: 'Loading...',
        showStores: false,
        selectedStore: null,
        isLoading: true,
        firstName: null,
        lastName: null,
        email: null,
        showAvailabilityModal: false,
        showAChatModal: false,
        showCameraModal: false,
        showNewChatModal: false,
        initialLoad: true,
        initialState: true,
        newChatCount: 0
    //    url: 'https://www.brandingbrand.com',
    //    source: {}

      }
  //    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
    }
    getChatsSummary = (offset,limit,fullChatList) => {

      fullChatList = fullChatList || [];

      this.sdk.getChatsSummary({
        offset: offset,
        limit: limit,
       })
        .then(({chatsSummary,totalChats}) => {
          
          fullChatList = [...fullChatList, ...chatsSummary];

          this.iterateOver(chatsSummary, (chat, report, fields) => { 

            chat.myLastVisit = chat.lastSeenTimestamps[this.state.customerId];

            let properties = chat.properties && chat.properties.chatInfo;
            if (properties) {
              chat.title = properties.title.value;
              chat.area = properties.area.value;
              chat.storeTitle = properties.store.value;
            }

            // chat.title = fields['chat_'+chat.id];
            // chat.storeTitle = fields['store_'+chat.id];
            // chat.area  = fields['category_'+chat.id];

            for (var user in chat.lastSeenTimestamps) {
              if (chat.lastSeenTimestamps.hasOwnProperty(user)) {
                if ((user != this.state.customerId) && (!chat.adminLastSeen || chat.lastSeenTimestamps[user] > chat.adminLastSeen)) {
                  chat.adminLastSeen = chat.lastSeenTimestamps[user]
                }                  
              }
            }
            

            if (chat.lastEvent) {
              const threadsArr = [chat.lastEvent.thread];
              this.sdk.getChatThreads(chat.id, threadsArr)
              .then(threads => {
                  chat.isActive = threads[0].active;                      
                  report();
              })
              .catch(error => {
                  console.log(error)
              });
            } else {
              report();
            }

                  
          }, this.setChatState, totalChats, fullChatList, offset);
        })
        .catch(error => {
            console.log(error)
            console.log(fullChatList)
        })
    }

    // onNavigatorEvent(event) {
    //   switch(event.id) {
    //     case 'willAppear':
    //     this.setState({
    //       userData: []
    //     })
    //     if (this.state.isConnected) {
    //       this.getChatsSummary(0,25);
    //     }
    //     break;
    //   }
    // }
  
  
  iterateOver = (list, iterator, callback, totalChats, fullChatList, offset) => {
      offset = offset || 0;
      let doneCount = 0;
      let fullDoneCount = fullChatList.length - list.length; 
      // if (!fullChatList) {
      //   fullChatList = list.slice();
      // }
      report = () => { 
          doneCount++;  
          fullDoneCount++;
          // done looping through loaded chats

          if (doneCount === list.length) {
            // all chats loaded
//            console.log(fullDoneCount,totalChats)
            if (fullDoneCount === totalChats) {
              callback(fullChatList);
            } else {
              offset = offset + 25;
              // there are more chats to load
              this.getChatsSummary(offset,25,fullChatList);
            }
          }
              
      }
      
      let userData = this.state.userData.slice();
      let fields = {};
    
      let users = [];
      for (i=0; i<userData.length; i++) {
        if (userData[i].type === 'customer') {
          users.push(userData[i]);
        }
      }
      // sort ascending
      // users.sort(function(a, b) {
      //   return a.lastSeenTimestamp - b.lastSeenTimestamp
      // }); 
      // go through users to get all title fieldss
      for (var i=0; i<users.length; i++) {
        Object.assign(fields,users[i].fields);
      }
      let lastUserIdx = users.length-1;
      // console.log('USERRRRRRRRRRRRRR')
      // console.log(users)
      // console.log(users[lastUserIdx])
      // console.log(fields)
      for(var i = 0; i < list.length; i++) {
       // console.log(list[i],users[0].fields)
          iterator(list[i], report, fields)
      }
  }
  updateChats = (chat) => {
    let chatList = this.state.chats.slice();
    for (i=0; i<chatList.length; i++) {
      
      if (chatList[i].id === chat.chat) {
        if (!chatList[i].lastEvent) chatList[i].lastEvent = {};
        chatList[i].lastEvent.text = chat.event.text;
        chatList[i].lastEvent.timestamp = chat.event.timestamp;
        chatList[i].order = chat.event.timestamp;
        chatList[i].isActive = true;
        break;
      }
    }
    this.updateChatHistory(chatList);
  }

  updateChatHistory = (chats) => {
    this.setState({
      chats: chats
    })
  }

  setChatState = (chats) => {
    this.setState({
      chats: chats
    })
  }
  

  initSdk = (store) => {
    console.log('initSdk:')
    
    let storeConfig = config.stores[store.custom.store_id];
    console.log(storeConfig)
    if (this.sdk) {
      this.sdk.destroy();
    } 
    console.log('now init sdk')
      this.sdk = init({ 
        license: storeConfig.license,
        clientId: storeConfig.clientId,
        redirectUri: 'https://app.chat.io/'
      });
          

      this.sdk.on('connected', ({ chatsSummary, totalChats }) => {


        console.log('on connected', { chatsSummary, totalChats })
        this.updateChatHistory(chatsSummary);
        this.setState({
          isLoading: false,
          isConnected: true
        })
  
  
        this.iterateOver(chatsSummary, (chat, report, fields) => {
          let properties = chat.properties && chat.properties.chatInfo;
          if (properties) {
            chat.title = properties.title.value;
            chat.area = properties.area.value;
            chat.storeTitle = properties.store.value;
          }
         //   chat.title         = fields['chat_'+chat.id];
         //   chat.area          = fields['category_'+chat.id];
          //  chat.storeTitle    = fields['store_'+chat.id];
            chat.myLastVisit   = chat.lastSeenTimestamps[this.state.customerId];
            chat.adminLastSeen = null;
            if (chat.lastEvent) {
  
              for (var user in chat.lastSeenTimestamps) {
                if (chat.lastSeenTimestamps.hasOwnProperty(user)) {
                  if ((user != this.state.customerId) && (!chat.adminLastSeen || chat.lastSeenTimestamps[user] > chat.adminLastSeen)) {
                    chat.adminLastSeen = chat.lastSeenTimestamps[user]
                  }                  
                }
              }
              
              if (chat.lastEvent) {
                const threadsArr = [chat.lastEvent.thread];
                
                this.sdk.getChatThreads(chat.id, threadsArr)
                .then(threads => {
                    chat.isActive = threads[0].active;                
                    report();
                })
                .catch(error => {
                    console.log(error)
                });
              } else {
                report();
              }

              

            } else {
              report();
            }
  
                
        }, this.setChatState, totalChats, chatsSummary);
      })
  
      this.sdk.on('connection_lost', () => {
        console.log('connection_lost')
        this.setState({
          userData: []
        })
      })
      this.sdk.on('disconnected', reason => {
        console.log('disconnected')
        console.log(reason)
      })
      this.sdk.on('connection_restored', payload => {
        console.log('connection_restored')
        this.getChatsSummary(0,25);
      })
      this.sdk.on('customer_id', id => {
        this.setState({
          customerId: id
        })
      })
  
      this.sdk.on('new_event', (payload) => {
        if (this._isMounted) {
          this.updateChats(payload);
        }      
      })
      this.sdk.on('user_data', (user) => {
        this.addGlobalUsers(user);
      })
      this.sdk.on('thread_closed', ({ chat }) => {
        this.getChatsSummary(0,25);
      })
      // this.sdk.on('chat_properties_updated', (data) => {

      // })
      this.sdk.on('thread_summary', (thread_summary) => {

      })
     

  }

  setStores = (stores) => {
    // populate stores
    this.setState({
      initialState: false,
      stores: stores,
      showStores: true,
      isLoading: false
    })
  }
  componentWillUnmount() {
    if (this.sdk) {
      this.sdk.destroy();
    }
  }
  componentDidMount() {
    this._isMounted = true;

    storage.load({
      key: 'userState',
    }).then(user => {
      this.setState({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      })
    }).catch(err => {

    });


    // storage.remove({
    //   key: 'savedStore'
    // });
    storage.load({
      key: 'savedStore',
    }).then(store => {
      this.setState({
        selectedStore: store
      })
    }).catch(err => {
    });

    
    setTimeout(() => {
      if (this.state.selectedStore) {
        this.setState({
          isLoading: true,
          initialState: false,
          showStores: false,
        });
        this.initSdk(this.state.selectedStore);
      } else {
        this.setState({showAvailabilityModal:true})
        setTimeout( () => {
          this.setState({
            isLoading:false
          })
        },400)
      }
      this.setState({
        initialLoad:false
      })
    },1000);
    // this.setState({
    //   source: this.source
    // })
    // setTimeout(() => {
    //   console.log('setting state again')
    //   this.setState({
    //     source: this.source2
    //   })
    //   // this.setState({
    //   //   url: 'https://www.amazon.com/'
    //   // })
    // },5000)

  }

    resetLoadingState = () => {
      setTimeout(() => {
        this.setState({
          isLoading: false,
          loadingText: 'Loading...'
        })
      },1000);

    }
    beginChatCallback = (obj) => {
      this.setState({
        isLoading: true,
        loadingText: 'Starting Chat...'
      })
      let newChatProps = {
        area: obj.area,
        name: obj.name,
        email: obj.email,
        description: obj.description,
        customerId: obj.customerId,
        storeTitle: this.state.selectedStore.title,
        title: obj.description,
      }
      this.setState({
        chatProps: newChatProps
      })
      setTimeout(() => {
        this._showModal('Chat');
      }, 1000);


    }
    onPressNewChat = () => {
      this._showModal('NewChat');
    }
    renderAuthView() {
      if (this._isMounted) {
        return (
          <View style={{
            height: 0,
            backgroundColor: 'transparent'
          }}><AuthWebView style={styles.auth} /></View>
        )
      }
      return null;
    }
    addGlobalUsers = (user) => {
      if (this._isMounted) {
        this.setState({
          userData: [user, ...this.state.userData]
        });
      }
    }
    goBackFromChat = () => {
      this._hideModal('Chat');
      setTimeout(() => {
        this.getChatsSummary(0,25);
      },200)
      
    }

    selectStore = (store) => {      
      this.setState({
        isLoading: true,
        showStores: false,
        selectedStore: store
      });
      console.log('settings isLoading:true, showStores: false, selectStore:')
      console.log(store)
      storage.save({
        key: 'savedStore', 
        data: store
      });
      console.log('store saved to AsyncStorage')

      // if (ACEChatViewController) {
      //   ACEChatViewController.updateChatBadge('Birthday Party', '4 Privet Drive, Surrey');
      // }
      
      this.initSdk(store);

      // this.props.navigation.navigate('Chat', {
      //   sdk: this.sdk,
      //   customerId: this.state.customerId,
      //   chatId: chat.id,
      //   storeTitle: 'Rick\'s Ace Hardware',
      //   title: chat.title.toUpperCase(),
      //   isActive: chat.isActive,
      //   adminLastSeen: chat.adminLastSeen,
      //   userData: this.state.userData,
      //   goBackFromChat: this.goBackFromChat
      // });
    }

    loadChat = (chat) => {
      console.log('load chat with id: '+chat.id)
      chat.myLastVisit = Date.now();
      let loadChatProps = {             
        customerId: this.state.customerId,
        chatId: chat.id,
        storeTitle: chat.storeTitle,
        title: chat.title.toUpperCase(),
        isActive: chat.isActive,
        adminLastSeen: chat.adminLastSeen,
        userData: this.state.userData
      }
      console.log(loadChatProps);
      this.setState({
        chatProps: loadChatProps
      })
      this._showModal('Chat');

      // this.props.navigation.navigate('Chat', {
      //   sdk: this.sdk,
      //   customerId: this.state.customerId,
      //   chatId: chat.id,
      //   storeTitle: chat.storeTitle,
      //   title: chat.title.toUpperCase(),
      //   isActive: chat.isActive,
      //   adminLastSeen: chat.adminLastSeen,
      //   userData: this.state.userData,
      //   goBackFromChat: this.goBackFromChat
      // });

      // this.props.navigator.push({
      //   screen: 'ChatIOsdk',
      //   passProps: {
      //     sdk: this.sdk,
      //     customerId: this.state.customerId,
      //     chatId: chat.id,
      //     title: 'Rick\'s Ace Hardware',
      //     subtitle: chat.title.toUpperCase(),
      //     isActive: chat.isActive,
      //     adminLastSeen: chat.adminLastSeen,
      //     userData: this.state.userData
      //   },
      //   navigatorButtons: {
      //     leftButtons: [{
      //       id: 'back',
      //       disableIconTint: true,
      //       icon: require('../img/back_icn.png')
      //     },
      //     ],
      //     rightButtons: [{
      //       id: 'end',
      //       disableIconTint: true,
      //       icon: require('../img/end-chat.png')  
      //     }]
      //   }
      // });
    }
    renderAddress(store,addressStyles) {  
      addressStyles = addressStyles || {};    
      return (
        <View>
          {store.address.map(line => {
            return (
              <Text key={line} numberOfLines={1} style={[Common.fontRegular,styles.message,addressStyles]}>{line}</Text>
            );
          })}
        </View>
      )
    }

    _showModal = (modal) => {
      switch(modal) {
        case "Availability":
          this.setState({ showAvailabilityModal: true });
          break;
        case "NewChat":
          this.setState({ showNewChatModal: true });
          break;
        case "Chat":
          this.setState({ showChatModal: true });
          break;
        case "Camera":
          this.setState({ showCameraModal: true });
          break;
      }
      
    }    
    _hideModal = (modal) => {
      switch(modal) {
        case "Availability":
          this.setState({ showAvailabilityModal: false });
          break;
        case "NewChat":
          this.setState({ showNewChatModal: false });
          break;
        case "Chat":
          this.setState({ showChatModal: false });
          break;
        case "Camera":
          this.setState({ showCameraModal: false });
          break;
      }
    }

    renderNewChatModal() {
      return (
        <Modal 
        style={{flex:1,margin:0,padding:0,justifyContent:'center',alignItems:'center'}}
        isVisible={this.state.showNewChatModal}
        animationInTiming={400}
        animationOutTiming={400}
        backdropTransitionInTiming={1}
        backdropTransitionOutTiming={1}
        backdropOpacity={0}
        avoidKeyboard={true}
      >
        <NewChat 
          closeHandler={() => this._hideModal('NewChat')}          
          sdk={this.sdk}
          store={this.state.selectedStore}
          customerId={this.state.customerId}
          callback={this.beginChatCallback}
          firstName={this.state.firstName}
          lastName={this.state.lastName}
      
          email={this.state.email}
        />
      </Modal>
      )
    }
    renderAvailabilityModal() {
      return (
        <Modal 
        style={{flex:1,margin:0,padding:0,justifyContent:'center',alignItems:'center'}}
        isVisible={this.state.showAvailabilityModal}
        animationInTiming={this.state.initialLoad ? 400 : 400}
        animationOutTiming={400}
        backdropTransitionInTiming={1}
        backdropTransitionOutTiming={1}
        backdropOpacity={0}
      >
        <Availability 
          closeHandler={() => this._hideModal('Availability')}
          setStoresCallback={this.setStores}
        />
      </Modal>
      )
    }
    renderChatModal() {
      return (
        <Modal 
        style={{flex:1,margin:0,padding:0,justifyContent:'center',alignItems:'center'}}
        isVisible={this.state.showChatModal}
        animationIn='slideInRight'
        animationOut='slideOutRight'
        animationInTiming={400}
        animationOutTiming={300}
        backdropTransitionInTiming={400}
        backdropTransitionOutTiming={300}
        backdropOpacity={.5}
      >

        <ChatIO 
          area={this.state.chatProps.area}
          name={this.state.chatProps.name}
          email={this.state.chatProps.email}
          description={this.state.chatProps.description}
          sdk={this.sdk}
          customerId={this.state.chatProps.customerId}
          storeTitle={this.state.chatProps.storeTitle}
          title={this.state.chatProps.title}
          goBackFromChat={this.goBackFromChat}
          callback={this.resetLoadingState}
          chatId={this.state.chatProps.chatId}
          isActive={this.state.chatProps.isActive}
          adminLastSeen={this.state.chatProps.adminLastSeen}
          userData={this.state.chatProps.userData}
        />
      </Modal>
      )
    }

    renderStoreStatus() {
      let { selectedStore } = this.state;
      return (
        <View style={{
          backgroundColor: '#f3efe8',
          borderBottomWidth: 1,
          borderBottomColor: '#e2d3bc',
          paddingTop: 8,
          marginBottom: 0,
          height:58,
          width:'100%'
        }}>
          <View style={{flexDirection:'column',flex:1,paddingLeft:10,paddingRight:10,marginBottom:5,alignItems:'flex-start'}}>
            <View>
            <View style={{
                flexDirection: 'row',
                width:'100%',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View>
                  <Text style={[Common.fontRegular,{fontSize:13,marginRight:5,height:15}]}>{selectedStore.title}</Text>
                  {this.renderAddress(selectedStore,{fontSize:13,lineHeight:13,height:14})}
                </View>                  
                <TouchableWithoutFeedback
                  onPress={() => { 
                      this._showModal('Availability')
                    }
                  }
                >
                  <View><Text style={[Common.fontMedium,{fontSize:13,height:15,color:'#f4002d'}]}>Change store</Text></View>
                </TouchableWithoutFeedback>
              </View>
              

            </View>
          </View>
        </View>
      )
    }
    // chatIncrease = () => {
    //   let count = this.state.newChatCount;
    //   this.setState(function(prevState, props){
    //     if (ACEChatViewController) {
    //       ACEChatViewController.updateChatBadge(prevState.newChatCount + 1);
    //     }
    //     return {newChatCount: prevState.newChatCount + 1}
    //   });


    // }
    // chatReset = () => {
    //   this.setState({
    //     newChatCount: 0
    //   })
    //   if (ACEChatViewController) {
    //     ACEChatViewController.updateChatBadge(0);
    //   }
    // }
    renderChats(stores,chats) {
      if (this.state.isLoading) {
        return (
          <View style={styles.container}>
            { this.renderAuthView() }
            <Bubbles loader={true} size={8} color="#d80024" />
            <Text style={[Common.fontMedium,{color:'#d80024',marginTop:10,fontSize:15}]}>{this.state.loadingText}</Text>
          </View>
        );
      }

      if (this.state.initialState) {
        return (
          <View style={styles.containerChats}>
          { this.renderAuthView() }
          <ScrollView style={{paddingTop:5}}>
            <View style={[styles.containerNoChats]}>
              <Text style={[styles.noChats,Common.fontMedium,{fontSize:16,color: '#5b5b5b',textAlign:'center',flex:1}]}>Welcome to Ace Chat!</Text>
              <Text style={[styles.noChats,Common.fontRegular,{fontSize:16,color: '#5b5b5b',textAlign:'center',width:220,flex:1,marginTop: 8, marginBottom: 7}]}>You must select a location to check chat availability.</Text>
              <TouchableOpacity
                  style={[styles.button,{height:40}]}
                  onPress={() => this._showModal('Availability')}
                >
                  <LinearGradient colors={['#e21836', '#b11226']} style={styles.linearGradient}>
                  <Text style={styles.buttonText}>CHAT AVAILABILITY</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
            </View>
            
          </ScrollView>
          </View>
        );
      }


      if (this.state.showStores && stores.length) {
        return (
          <View style={styles.containerChats}>
          { this.renderAuthView() }
          <ScrollView style={{paddingTop:0}}>
            <View style={[styles.containerNoChats,{marginTop:30}]}>
              <Text style={[styles.noChats,Common.fontMedium,{fontSize:16,color: '#5b5b5b',textAlign:'center',flex:1}]}>Ace Chat is available at your location!</Text>
              <Text style={[styles.noChats,Common.fontRegular,{fontSize:16,color: '#5b5b5b',textAlign:'center',flex:1,marginTop: 8, marginBottom: 7}]}>Select a location you would like to chat with.</Text>
            </View>
            {stores.map(store => {
              return (
              <TouchableHighlight
                key={store.id}
                onPress={() => this.selectStore(store)}
                underlayColor={'#eee'}
                style={[styles.row,{height:70}]}
              >
                <View style={{                  
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingLeft: 8
                  }}>                               
                    <View style={styles.chat}>
                      <Text numberOfLines={1} style={[Common.fontBold,styles.description]}>{store.title}</Text>
                      {this.renderAddress(store)}
                    </View>
                    <Image style={{height: 14,width: 8,marginTop:-2}} source={images.arrowRight} />

                </View>

              </TouchableHighlight>

            ) } )}  

            </ScrollView>
          </View>  
        );
      }
        
      if (chats.length) {

        let activeChats   = chats.filter(chat => { return chat.isActive && chat.title && !~hideChats.indexOf(chat.id); });
        let previousChats = chats.filter(chat => { return !chat.isActive && chat.title && !~hideChats.indexOf(chat.id); });
        return (          
          <View style={styles.containerChats}>
            { this.renderAuthView() }
            {this.renderStoreStatus()}
            <ScrollView style={{paddingTop:12}}>
          
              <View style={{flex:1,alignItems:'center',marginBottom:20}}>
                
                <TouchableOpacity
                  style={[styles.button,{height:40}]}
                  onPress={this.onPressNewChat}
                >
                  <LinearGradient colors={['#e21836', '#b11226']} style={styles.linearGradient}>
                    <Text style={styles.buttonText}>START NEW CHAT</Text>
                  </LinearGradient>
                  {/* <View style={styles.linearGradient}>
                  <Text style={styles.buttonText}>START NEW CHAT</Text>
                  </View>
                  */}

                </TouchableOpacity>
                
              </View>
              <Text
                style={[Common.fontMedium,{
                  fontSize: 15,
                  color: '#5b5b5b',
                  marginBottom: 5,
                  paddingHorizontal: 16
                }]}>Open Chats</Text>
              {!activeChats.length && <View style={styles.empty}><Text style={[Common.fontRegular,{flex:1,fontSize:16,color:'#999',textAlign:'center'}]}>No open chats</Text></View>}
              {activeChats.map(chat => {
                return (
                <TouchableHighlight
                  key={chat.id}
                  onPress={() => this.loadChat(chat)}
                  underlayColor={'#eee'}
                  style={styles.row}
                >
                  <View style={{                  
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={[styles.newMessageDotOff, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageDotOn]} />
                      <Image style={{height: 40,width: 40,marginRight: 10}} source={images[chat.area]} />
                      <View style={styles.chat}>
                      <View style={{                  
                          flexDirection: 'row',
                        }}>
                          <Text numberOfLines={1} style={[Common.fontRegular,styles.store, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageColor]}>{chat.storeTitle ? chat.storeTitle : 'No store found'}</Text>
                          <Text style={[Common.fontRegular,styles.time, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageTime]}>{chat.lastEvent && moment(chat.lastEvent.timestamp).calendar(null, {
                            sameDay: 'h:mm a',
                            nextDay: '[Tomorrow]',
                            nextWeek: 'ddd',
                            lastDay: '[Yesterday]',
                            lastWeek: '[Last] ddd',
                            sameElse: 'MM/DD/YY'
                        })}</Text>
                          <Image style={{height: 14,width: 8,marginRight: 5,marginTop:-2}} source={images.arrowRight} />
                      </View>
                      <Text numberOfLines={1} style={[Common.fontRegular,styles.description, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageBold]}>{chat.title ? chat.title : 'Loading...'}</Text>
                      <Text numberOfLines={1} style={[Common.fontRegular,styles.message, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageColor]}>{chat.lastEvent && chat.lastEvent.type === 'annotation' ? chat.lastEventsPerType && chat.lastEventsPerType.message && chat.lastEventsPerType.message.text : chat.lastEvent && chat.lastEvent.text ? chat.lastEvent.text : chat.lastEvent && chat.lastEvent.type === 'file' && chat.lastEvent.contentType === 'image/jpeg' && '<Image file sent>'}</Text>
                    </View>
                  </View>

                </TouchableHighlight>

              ) } )}     

              <Text
                style={[Common.fontMedium,{
                  fontSize: 15,
                  color: '#5b5b5b',
                  marginBottom: 5,
                  marginTop: 25,
                  paddingHorizontal: 16
                }]}>Previous Chats</Text>

              {!previousChats.length && <View style={styles.empty}><Text style={[Common.fontRegular,{flex:1,fontSize:16,color:'#999',textAlign:'center'}]}>No previous chats</Text></View>}  
              {previousChats.map(chat => (
                <TouchableHighlight
                  key={chat.id}
                  onPress={() => this.loadChat(chat)}
                  underlayColor={'#eee'}
                  style={styles.row}
                >
                  <View style={{                  
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={[styles.newMessageDotOff, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageDotOn]} />
                      <Image style={{height: 40,width: 40,marginRight: 10}} source={images[chat.area]} />
                      <View style={styles.chat}>
                      <View style={{                  
                          flexDirection: 'row',
                        }}>
                          <Text numberOfLines={1} style={[Common.fontRegular,styles.store, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageColor]}>{chat.storeTitle ? chat.storeTitle : 'No store found'}</Text>
                          <Text style={[Common.fontRegular,styles.time, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageTime]}>{chat.lastEvent && moment(chat.lastEvent.timestamp).calendar(null, {
                            sameDay: 'h:mm a',
                            nextDay: '[Tomorrow]',
                            nextWeek: 'ddd',
                            lastDay: '[Yesterday]',
                            lastWeek: '[Last] ddd',
                            sameElse: 'MM/DD/YY'
                        })}</Text>
                          <Image style={{height: 14,width: 8,marginRight: 5,marginTop:-2}} source={images.arrowRight} />
                      </View>
                      <Text numberOfLines={1} style={[Common.fontRegular,styles.description, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageBold]}>{chat.title ? chat.title : 'Loading...'}</Text>
                      <Text numberOfLines={1} style={[Common.fontRegular,styles.message, (chat.lastEvent && chat.lastEvent.timestamp > chat.myLastVisit) && styles.newMessageColor]}>{chat.lastEvent && chat.lastEvent.type === 'annotation' ? chat.lastEventsPerType && chat.lastEventsPerType.message && chat.lastEventsPerType.message.text : chat.lastEvent && chat.lastEvent.text ? chat.lastEvent.text : chat.lastEvent && chat.lastEvent.type === 'file' && chat.lastEvent.contentType === 'image/jpeg' && '<Image file sent>'}</Text>
                    </View>
                  </View>

                </TouchableHighlight>

              ))} 
            </ScrollView>
          </View>
        );
      }
      return (
        <View style={[styles.containerChats,{
          alignItems: 'center',
          paddingTop: 0,
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }]}>
          { this.renderAuthView() }
          
          { this.renderStoreStatus() } 
          <View style={{marginTop: 80,}}>
            <Text style={[styles.noChats,Common.fontMedium,{fontSize:16,color: '#5b5b5b'}]}>You do not have a chat history.</Text>
            <Text style={[styles.noChats,Common.fontRegular,{fontSize:16,color: '#5b5b5b',marginTop: 15, marginBottom: 30}]}>Start a new chat below to talk with one of our Ace representatives near you!</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={this.onPressNewChat}
            >
              <LinearGradient colors={['#e21836', '#b11226']} style={styles.linearGradientNoHistory}>
                <Text style={styles.buttonText}>START NEW CHAT</Text>
              </LinearGradient>
              {/* <View style={styles.linearGradientNoHistory}>
                <Text style={styles.buttonText}>START NEW CHAT</Text>
              </View> */}
            </TouchableOpacity>
          </View>
        
        </View>
      );
      
      
    }
    onMessage = (event) => console.log(event.nativeEvent.data)

    render() {
      const {
        chats,
        stores
      } = this.state;
      return (
        <View style={styles.RNcontainer}>
          {Platform.OS == 'ios'  && <Header title="CHAT" />}
          <View style={{
             flex: 1,
             backgroundColor: '#eee6d9',
             width:'100%'
           }}>
            {this.renderChats(stores,chats)}
            {this.renderAvailabilityModal()}
            {this.renderNewChatModal()}
            {this.renderChatModal()}
          </View>
        </View>        
      )
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 0,
    //  marginTop: -130,
      backgroundColor: '#eee6d9'
    },
    containerNoChats: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 0,
      marginTop: 130,
      backgroundColor: '#eee6d9'
    },
    RNcontainer: {
      flex: 1,
      flexDirection:'column',
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%'
    },
    linearGradient: {
      flex: 1,
      paddingLeft: 15,
      paddingRight: 15,
      borderRadius: 5,
      borderWidth: 0,
      width: 195,
      height: 40,
      justifyContent: 'center',
      padding: 10
    },
    linearGradientNoHistory: {
      paddingLeft: 15,
      paddingRight: 15,
      borderRadius: 5,
      borderWidth: 0,
      width: 195,
      height: 40,
      justifyContent: 'center',
      padding: 10
    },
    buttonText2: {
      fontSize: 18,
      fontFamily: 'Gill Sans',
      textAlign: 'center',
      margin: 10,
      color: '#ffffff',
      backgroundColor: 'transparent',
    },
    buttonText: {
      color: '#FFF',
      fontSize: 16,
      textAlign: 'center',
      fontFamily: 'HelveticaNeue-CondensedBold',
      backgroundColor: 'transparent',
    },
    auth: {
      position: 'absolute',
      left: 500,
      top: -400,
      backgroundColor: '#eee6d9',
      height: 1
       
    },
    containerChats: {
      flex: 1,
      backgroundColor: '#eee6d9',
    },
    row: {
      height: 72,
      flex:1,
      paddingTop: 3,
      paddingRight: 18,
      paddingLeft: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e3e3e3',
      borderTopColor: '#e3e3e3',
    },
    empty: {
      height: 50,
      flex:1,
      paddingTop: 3,
      paddingRight: 18,
      paddingLeft: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: '#f3efe8',
      borderBottomWidth: 1,
      borderTopWidth: 1,
      borderBottomColor: '#e2d3bc',
      borderTopColor: '#e2d3bc',
    },
    newMessageDotOff: {
      width: 5,
      height: 5,
      borderRadius: 5,
      marginRight: 7,
      backgroundColor: 'transparent'
    },
    newMessageDotOn: {
      backgroundColor: '#d80024'
    },
    chat: {
      width: '100%',
      flex: 1
    },
    time: {
      fontSize: 12,
      color: '#6c6c6c',
      flex: 3,
      textAlign: 'right',
      marginRight: 7
    },  
    store: {
      fontSize: 12,
      color: '#6c6c6c',
      flex: 5
    },  
    newMessageBold: {
      fontFamily: 'HelveticaNeueLTStd-BdCn'
    },
    newMessageColor: {
      color: '#000'
    }, 
    newMessageTime: {
      color: '#000',
      fontFamily: 'HelveticaNeueLTStd-BdCn'
    },   
    description: {
      fontSize: 15,
      color: '#000',
      lineHeight: 17
    },  
    message: {
      fontSize: 14,
      color: '#6c6c6c',
    },  
    noChats: {
      color: '#777',
      fontSize: 16,
      width: 270,
      textAlign: 'center',
      fontFamily: 'HelveticaNeue-CondensedBold'
    },
    button: {
      alignItems: 'center',
//      backgroundColor: '#d80024',

    },

  });

  // const mapStateToProps = state => {
  //   console.log(state)
  //   return {
  //     chatInfo: state.chatInfo
  //   }
  // }
  // function mapStateToProps(state, ownProps) {
  //   return {
  //     nowPlayingMovies: state.movies.nowPlayingMovies,
  //     popularMovies: state.movies.popularMovies
  //   };
  // }
  
  // function mapDispatchToProps(dispatch) {
  //   return {
  //     actions: bindActionCreators(moviesActions, dispatch)
  //   };
  // }
  export default Home;
  //export default connect(mapStateToProps, actions)(Home);